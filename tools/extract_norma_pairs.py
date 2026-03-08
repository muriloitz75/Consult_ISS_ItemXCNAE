import json
import re
from pathlib import Path

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
PDF_PATH = ROOT / "docs" / "norma.pdf"
JSON_PATH = ROOT / "dados.json"


def extract_text_from_pdf(path: Path) -> str:
    reader = PdfReader(str(path))
    chunks = []
    for page in reader.pages:
        chunks.append(page.extract_text() or "")
    return "\n".join(chunks)


def normalize_lc(raw: str) -> str:
    raw = raw.replace(",", ".")
    if "." not in raw:
        if len(raw) >= 3:
            return f"{raw[:-2]}.{raw[-2:]}"
        return raw
    left, right = raw.split(".", 1)
    return f"{left.zfill(2)}.{right.zfill(2)}"


def normalize_cnae(raw: str) -> str:
    raw = raw.strip()
    if re.fullmatch(r"\d{4}-\d/\d{2}", raw):
        return raw
    if re.fullmatch(r"\d{4}/\d{2}-\d{2}", raw):
        left4, rest = raw.split("/", 1)
        mid2, end2 = rest.split("-", 1)
        return f"{left4}-{mid2[0]}/{end2}"
    return raw


def parse_pairs(text: str):
    cnae_pattern = re.compile(r"\b(?:\d{4}-\d/\d{2}|\d{4}/\d{2}-\d{2})\b")
    lc_pattern = re.compile(r"\b\d{1,2}[.,]\d{1,2}\b")

    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    pairs = []
    for line in lines:
        cnaes = [normalize_cnae(x) for x in cnae_pattern.findall(line)]
        lcs = lc_pattern.findall(line)
        if not cnaes or not lcs:
            continue
        for lc in lcs:
            nlc = normalize_lc(lc)
            for cnae in cnaes:
                pairs.append((nlc, cnae))
    return pairs


def current_pairs(json_path: Path):
    data = json.loads(json_path.read_text(encoding="utf-8"))
    result = set()
    for row in data:
        lc = str(row.get("LIST LC", "")).strip()
        cnae = str(row.get("CNAE", "")).strip()
        if lc and cnae:
            result.add((lc, cnae))
    return data, result


def main():
    if not PDF_PATH.exists():
        raise SystemExit(f"PDF não encontrado: {PDF_PATH}")
    text = extract_text_from_pdf(PDF_PATH)
    (ROOT / "tools" / "norma_text_sample.txt").write_text(text[:30000], encoding="utf-8")
    print(f"Tamanho texto extraído: {len(text)}")
    pdf_pairs = set(parse_pairs(text))
    data, existing = current_pairs(JSON_PATH)

    missing = sorted(pdf_pairs - existing)
    print(f"Pares no PDF: {len(pdf_pairs)}")
    print(f"Pares em dados.json: {len(existing)}")
    print(f"Faltantes: {len(missing)}")
    for lc, cnae in missing[:200]:
        print(f"{lc} -> {cnae}")


if __name__ == "__main__":
    main()
