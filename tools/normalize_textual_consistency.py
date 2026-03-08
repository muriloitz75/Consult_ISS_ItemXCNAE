import json
import re
from collections import Counter, defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
JSON_PATH = ROOT / "dados.json"


def compact_spaces(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def fix_ocr_splits(value: str) -> str:
    text = compact_spaces(value)
    replacements = {
        "c ondicionado": "condicionado",
        "ca pitalização": "capitalização",
        "e letricidade": "eletricidade",
        "r adiologia": "radiologia",
        "ava liação": "avaliação",
        "a parelhos": "aparelhos",
        "blindage m": "blindagem",
        "exa mes": "exames",
    }
    for source, target in replacements.items():
        text = text.replace(source, target)
    return text


def choose_canonical(values: list[str]) -> str:
    cleaned = [fix_ocr_splits(v) for v in values if fix_ocr_splits(v)]
    if not cleaned:
        return ""
    counts = Counter(cleaned)
    return max(counts, key=lambda t: (counts[t], len(t)))


def main():
    data = json.loads(JSON_PATH.read_text(encoding="utf-8"))

    service_by_lc = defaultdict(list)
    cnae_desc_by_code = defaultdict(list)

    for row in data:
        lc = compact_spaces(row.get("LIST LC", ""))
        cnae = compact_spaces(row.get("CNAE", ""))
        service = fix_ocr_splits(row.get("Descrição item da lista da Lei Complementar nº 001/2003 - CTM", ""))
        cnae_desc = fix_ocr_splits(row.get("Descrição do CNAE", ""))

        if lc and service:
            service_by_lc[lc].append(service)
        if cnae and cnae_desc:
            cnae_desc_by_code[cnae].append(cnae_desc)

    canonical_service_by_lc = {lc: choose_canonical(values) for lc, values in service_by_lc.items()}
    canonical_cnae_desc_by_code = {cnae: choose_canonical(values) for cnae, values in cnae_desc_by_code.items()}

    fixed_service = 0
    fixed_cnae_desc = 0
    compacted_fields = 0

    for row in data:
        for key in ("LIST LC", "CNAE", "Descrição item da lista da Lei Complementar nº 001/2003 - CTM", "Descrição do CNAE", "Alíquota"):
            original = str(row.get(key, ""))
            compacted = fix_ocr_splits(original)
            if original != compacted:
                row[key] = compacted
                compacted_fields += 1

        lc = row.get("LIST LC", "")
        cnae = row.get("CNAE", "")

        target_service = canonical_service_by_lc.get(lc, "")
        if target_service and row.get("Descrição item da lista da Lei Complementar nº 001/2003 - CTM", "") != target_service:
            row["Descrição item da lista da Lei Complementar nº 001/2003 - CTM"] = target_service
            fixed_service += 1

        target_cnae_desc = canonical_cnae_desc_by_code.get(cnae, "")
        if target_cnae_desc and row.get("Descrição do CNAE", "") != target_cnae_desc:
            row["Descrição do CNAE"] = target_cnae_desc
            fixed_cnae_desc += 1

    JSON_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=4), encoding="utf-8")
    print(f"Campos compactados: {compacted_fields}")
    print(f"Descrições de serviço unificadas: {fixed_service}")
    print(f"Descrições de CNAE unificadas: {fixed_cnae_desc}")


if __name__ == "__main__":
    main()
