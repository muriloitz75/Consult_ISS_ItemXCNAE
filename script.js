// script.js extraído de index.html
const { useState, useEffect, useCallback, useMemo } = React;

// Hook personalizado para debounce
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        // Se o delay for 0, atualize imediatamente sem timeout
        if (delay === 0) {
            setDebouncedValue(value);
            return;
        }
        
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => clearTimeout(timer);
    }, [value, delay]);

    return debouncedValue;
}

// Hook para animações de entrada
function useAnimatedCounter(end, duration = 2000) {
    const [count, setCount] = useState(0);
    
    useEffect(() => {
        let startTime = null;
        const animate = (currentTime) => {
            if (!startTime) startTime = currentTime;
            const progress = Math.min((currentTime - startTime) / duration, 1);
            const currentCount = Math.floor(progress * end);
            setCount(currentCount);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        requestAnimationFrame(animate);
    }, [end, duration]);
    
    return count;
}

function App() {
    // Estados principais
    const [data, setData] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchCode, setSearchCode] = useState('');
    const [searchService, setSearchService] = useState('');
    const [searchCnaeCode, setSearchCnaeCode] = useState('');
    const [searchCnaeDesc, setSearchCnaeDesc] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [darkMode, setDarkMode] = useState(false);
    const [advancedMode, setAdvancedMode] = useState(false);
    const [showResults, setShowResults] = useState(false); // Novo estado para controlar visibilidade da tabela - inicia oculta

    const [noResults, setNoResults] = useState(false);
    const [sortField, setSortField] = useState('');
    const [sortDirection, setSortDirection] = useState('asc');
    
    // Novos estados para melhorias visuais
    const [isTyping, setIsTyping] = useState(false);
    const [searchPulse, setSearchPulse] = useState(false);

    // Debounced values
    const debouncedSearch = useDebounce(searchTerm, 300);
    const debouncedCode = useDebounce(searchCode, 300);
    const debouncedService = useDebounce(searchService, 300);
    const debouncedCnaeCode = useDebounce(searchCnaeCode, 300);
    const debouncedCnaeDesc = useDebounce(searchCnaeDesc, 300);



    // Carrega dados do XML
    useEffect(() => {
        const loadData = async () => {
            try {
                console.log('Iniciando carregamento dos dados XML...');
                const response = await fetch('./dados.xml');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const xmlText = await response.text();
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
                
                // Verificar se há erros de parsing
                const parseError = xmlDoc.querySelector('parsererror');
                if (parseError) {
                    throw new Error('Erro ao fazer parse do XML: ' + parseError.textContent);
                }
                
                // Extrair dados das linhas da tabela
                const rows = xmlDoc.querySelectorAll('TR');
                console.log(`Encontradas ${rows.length} linhas no XML`);
                const parsedData = [];
                
                rows.forEach(row => {
                    const cells = row.querySelectorAll('TH, TD');
                    if (cells.length >= 4) {
                        const listLC = cells[0].textContent.trim();
                        const descricaoItem = cells[1].textContent.trim();
                        const cnae = cells[2].textContent.trim();
                        const descricaoCnae = cells[3].textContent.trim();
                        
                        if (listLC && descricaoItem && cnae && descricaoCnae) {
                            // Filtrar o registro que contém os nomes dos campos
                            if (descricaoItem !== "Descrição item da lista da Lei Complementar nº 001/2003 - CTM") {
                                parsedData.push({
                                    "LIST LC": listLC,
                                    "Descrição item da lista da Lei Complementar nº 001/2003 - CTM": descricaoItem,
                                    "CNAE": cnae,
                                    "Descrição do CNAE": descricaoCnae
                                });
                            }
                        }
                    }
                });
                
                console.log(`Dados processados: ${parsedData.length} registros`);
                setData(parsedData);
            } catch (error) {
                console.error('Erro ao carregar dados XML:', error);
                // Mesmo com erro, permitir que a aplicação continue renderizando
                setData([]);
            } finally {
                setIsLoading(false);
                console.log('Carregamento finalizado');
            }
        };
        loadData();
    }, []);

    // Carrega preferências do localStorage
    useEffect(() => {
        const savedDarkMode = localStorage.getItem('darkMode');
        
        if (savedDarkMode) {
            setDarkMode(JSON.parse(savedDarkMode));
        }
    }, []);

    // Salva preferências no localStorage
    useEffect(() => {
        localStorage.setItem('darkMode', JSON.stringify(darkMode));
    }, [darkMode]);



    // Efeito de digitação e busca
    useEffect(() => {
        if (searchTerm || searchCode || searchService || searchCnaeCode || searchCnaeDesc) {
            setIsSearching(true);
            setIsTyping(true);
            setSearchPulse(true);
            const timer = setTimeout(() => {
                setIsTyping(false);
                setIsSearching(false);
            }, 1000);
            const pulseTimer = setTimeout(() => setSearchPulse(false), 500);
            return () => {
                clearTimeout(timer);
                clearTimeout(pulseTimer);
            };
        } else {
            setIsSearching(false);
        }
    }, [searchTerm, searchCode, searchService, searchCnaeCode, searchCnaeDesc]);

    // Função de filtro principal
    const filterData = useCallback(() => {
        if (!data.length) return [];
        
        let results = [...data];
        
        if (advancedMode) {
            if (debouncedCode) {
                const code = debouncedCode.toLowerCase();
                if (code.includes('.')) {
                    // Busca flexível para códigos com ponto (ex: "1.01" encontra "01.01")
                    results = results.filter(item => {
                        const itemCode = item["LIST LC"].toString().toLowerCase();
                        // Busca exata primeiro
                        if (itemCode === code) return true;
                        // Se não encontrou, tenta com zeros à esquerda e direita
                        const parts = code.split('.');
                        if (parts.length === 2) {
                            const paddedCode = parts[0].padStart(2, '0') + '.' + parts[1].padEnd(2, '0');
                            return itemCode === paddedCode;
                        }
                        return false;
                    });
                } else {
                    // Para números sem ponto, busca por códigos que começam com esse número
                    results = results.filter(item => {
                        const itemCode = item["LIST LC"].toString().toLowerCase();
                        return itemCode.startsWith(code + '.') || itemCode.startsWith(code.padStart(2, '0') + '.');
                    });
                }
            }

            if (debouncedService) {
                const term = debouncedService.toLowerCase();
                results = results.filter(item =>
                    item["Descrição item da lista da Lei Complementar nº 001/2003 - CTM"].toLowerCase().includes(term)
                );
            }

            if (debouncedCnaeCode && /^\d+$/.test(debouncedCnaeCode)) {
                const start = debouncedCnaeCode.substring(0, 2);
                results = results.filter(item =>
                    item.CNAE.toString().replace(/\D/g, '').startsWith(start)
                );
            }

            if (debouncedCnaeDesc) {
                const term = debouncedCnaeDesc.toLowerCase();
                results = results.filter(item =>
                    item["Descrição do CNAE"].toLowerCase().includes(term)
                );
            }
        }
        // Modo universal
        else {
            if (!debouncedSearch) return results;

            const isNumeric = /^\d+$/.test(debouncedSearch);
            const hasDot = debouncedSearch.includes('.');
            const fullCnaeMatch = debouncedSearch.replace(/\D/g, '');

            // Busca por LIST LC (códigos com ponto ou números puros)
            if (hasDot) {
                // Busca flexível para códigos com ponto (ex: "1.01" encontra "01.01")
                const searchLower = debouncedSearch.toLowerCase();
                results = results.filter(item => {
                    const itemCode = item["LIST LC"].toString().toLowerCase();
                    // Busca exata primeiro
                    if (itemCode === searchLower) return true;
                    // Se não encontrou, tenta com zeros à esquerda e direita
                    const parts = searchLower.split('.');
                    if (parts.length === 2) {
                        const paddedCode = parts[0].padStart(2, '0') + '.' + parts[1].padEnd(2, '0');
                        return itemCode === paddedCode;
                    }
                    return false;
                });
            }
            // Busca por CNAE (apenas números com pelo menos 2 dígitos)
            else if (isNumeric && debouncedSearch.length >= 2) {
                // Para números de 2 dígitos, busca por prefixo CNAE
                if (debouncedSearch.length === 2) {
                    results = results.filter(item =>
                        item.CNAE.toString().replace(/\D/g, '').startsWith(debouncedSearch)
                    );
                }
                // Para números maiores, busca mais específica
                else {
                    results = results.filter(item => {
                        const cnaeClean = item.CNAE.toString().replace(/\D/g, '');
                        return cnaeClean.startsWith(debouncedSearch) || cnaeClean === fullCnaeMatch;
                    });
                }
            }
            // Busca por LIST LC sem ponto (ex: "1" para encontrar "1.01", "1.02", etc.)
            else if (isNumeric && debouncedSearch.length === 1) {
                results = results.filter(item =>
                    item["LIST LC"].toString().startsWith(debouncedSearch + '.')
                );
            }
            // Busca por descrição do serviço (texto)
            else if (!isNumeric && debouncedSearch.length >= 3) {
                // Busca mais específica: deve conter o termo completo
                // Garantir que a busca seja case-insensitive
                const searchLower = debouncedSearch.toLowerCase();
                results = results.filter(item => {
                    const desc = item["Descrição item da lista da Lei Complementar nº 001/2003 - CTM"].toLowerCase();
                    const cnaeDesc = item["Descrição do CNAE"].toLowerCase();
                    return desc.includes(searchLower) || cnaeDesc.includes(searchLower);
                });
            }
            // Para buscas muito curtas (1-2 caracteres de texto), não retorna resultados
            else if (!isNumeric && debouncedSearch.length < 3) {
                results = [];
            }
        }

        // Filtro por categoria removido - agora sempre mostra todos os resultados

        setNoResults(results.length === 0 && !isLoading);
        return results;
    }, [data, advancedMode, debouncedSearch, debouncedCode, debouncedService, debouncedCnaeCode, debouncedCnaeDesc, isLoading]);

    const filteredData = useMemo(() => filterData(), [filterData]);

    // Efeito para mostrar/ocultar resultados automaticamente
    useEffect(() => {
        const hasActiveSearch = debouncedSearch || debouncedCode || debouncedService || debouncedCnaeCode || debouncedCnaeDesc;
        
        if (hasActiveSearch && filteredData.length > 0) {
            // Mostra automaticamente quando há busca e resultados
            setShowResults(true);
        } else if (!hasActiveSearch) {
            // Oculta quando não há busca ativa
            setShowResults(false);
        }
    }, [filteredData, debouncedSearch, debouncedCode, debouncedService, debouncedCnaeCode, debouncedCnaeDesc]);



    // Função para calcular alíquota baseada no código LIST LC
    const calculateAliquota = (listCode) => {
        // Remove espaços extras, normaliza o código e remove zeros à esquerda
        const code = listCode.toString().trim().replace(/\s+/g, '').replace(/^0+/, '');
        
        // DEBUG: Log para verificar se a função está sendo executada
        console.log(`ALIQUOTA DEBUG: Código original: '${listCode}' -> Normalizado: '${code}'`);
        
        // ORDEM IMPORTANTE: Verificar casos específicos PRIMEIRO
        
        // 4%: Subitens específicos 7.02, 7.03, 7.04, 7.05 (ANTES de outras regras)
        if (code === '7.02' || code === '7.03' || code === '7.04' || code === '7.05') {
            console.log(`ALIQUOTA DEBUG: Aplicando 4% para código ${code}`);
            return '4%';
        }
        
        // 4%: Item 14 e seus subitens
        if (code === '14' || code.startsWith('14.')) {
            console.log(`ALIQUOTA DEBUG: Aplicando 4% para item 14 - código ${code}`);
            return '4%';
        }
        
        // 2%: Subitens específicos 4.22 e 4.23 (ANTES da regra geral do item 4)
        if (code === '4.22' || code === '4.23') {
            console.log(`ALIQUOTA DEBUG: Aplicando 2% para código ${code}`);
            return '2%';
        }
        
        // 2%: Item 8 e todos seus subitens
        if (code === '8' || code.startsWith('8.')) {
            console.log(`ALIQUOTA DEBUG: Aplicando 2% para item 8 - código ${code}`);
            return '2%';
        }
        
        // 3%: Subitem específico 10.09
        if (code === '10.09') {
            console.log(`ALIQUOTA DEBUG: Aplicando 3% para código ${code}`);
            return '3%';
        }
        
        // 3%: Item 4 e seus subitens (EXCETO 4.22 e 4.23 já tratados acima)
        if (code === '4' || code.startsWith('4.')) {
            console.log(`ALIQUOTA DEBUG: Aplicando 3% para item 4 - código ${code}`);
            return '3%';
        }
        
        // 5%: Todos os demais itens
        console.log(`ALIQUOTA DEBUG: Aplicando 5% (padrão) para código ${code}`);
        return '5%';
    };

    console.log('App renderizando...', { darkMode, isLoading, data: data.length });
    
    return (
        <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gradient-to-br from-blue-50 to-indigo-100 text-gray-900'}`}>
            {/* TEXTO DA RESOLUÇÃO SEFAZGO */}
            <div className="w-full bg-blue-700 text-white text-center py-3 font-bold text-lg shadow-lg" style={{position: 'relative', zIndex: 9999}}>
                de Acordo com a RESOLUÇÃO Nº 01 DE 07/07/2021 - SEFAZGO
            </div>
            
            {/* Background mais limpo */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-purple-50/20 to-pink-50/10"></div>
            </div>

            <div className="max-w-6xl mx-auto px-4 py-6 relative z-10">
                {/* Header mais compacto e elegante */}
                <header className="text-center mb-8 animate-fadeInUp">
                    <div className="relative inline-block">
                        <h1 className={`text-3xl md:text-4xl font-bold mb-2 ${
                            darkMode 
                                ? 'bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400' 
                                : 'bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600'
                        }`}>
                            Consulta de Serviços & CNAEs
                        </h1>
                    </div>
                    <p className={`text-base ${darkMode ? 'text-gray-400' : 'text-gray-600'} animate-fadeInUp`} style={{animationDelay: '0.1s'}}>
                        Ferramenta para profissionais fiscais e contábeis
                    </p>
                </header>

                {/* Controles superiores mais compactos */}
                <div className="flex justify-end items-center mb-6 animate-fadeInUp" style={{animationDelay: '0.3s'}}>
                    {/* Toggle Dark Mode simplificado */}
                    <button
                        onClick={() => setDarkMode(!darkMode)}
                        className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-all duration-300 ${
                            darkMode 
                                ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' 
                                : 'bg-white text-gray-800 hover:bg-gray-50 shadow-sm'
                        }`}
                    >
                        {darkMode ? (
                            <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                                <span className="text-sm">Claro</span>
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                </svg>
                                <span className="text-sm">Escuro</span>
                            </>
                        )}
                    </button>
                </div>

                {/* Search Form mais compacto */}
                <div className={`${darkMode ? 'bg-gray-800/90' : 'bg-white/90'} backdrop-blur-sm rounded-2xl shadow-lg p-6 mb-6 border border-gray-200/50 animate-fadeInUp search-card-mobile`} style={{animationDelay: '0.4s'}}>
                    {/* Header da busca mais compacto */}
                    <div className="text-center mb-6">
                        <div className="flex justify-center items-center mb-3">
                            {!advancedMode && isSearching && (searchTerm || searchCode || searchService || searchCnaeCode || searchCnaeDesc) && (
                                <div className="mr-4">
                                    <img 
                                        src="Sand.gif" 
                                        alt="Animação de areia durante busca" 
                                        className="w-12 h-12 rounded-full shadow-lg opacity-80 animate-pulse"
                                    />
                                </div>
                            )}
                            <div>
                                <h2 className={`text-xl font-semibold ${
                                    darkMode 
                                        ? 'bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent' 
                                        : 'bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent'
                                }`}>
                                    {advancedMode ? 'Busca Avançada' : 'Busca Universal'}
                                </h2>
                                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                    {advancedMode ? 'Filtros específicos para busca precisa' : 'Busca inteligente em todos os campos'}
                                </p>
                            </div>
                            {!advancedMode && isSearching && (searchTerm || searchCode || searchService || searchCnaeCode || searchCnaeDesc) && (
                                <div className="ml-4">
                                    <img 
                                        src="Sand.gif" 
                                        alt="Animação de areia durante busca" 
                                        className="w-12 h-12 rounded-full shadow-lg opacity-80 animate-pulse"
                                    />
                                </div>
                            )}
                        </div>
                        
                        {/* Controles: Toggle Modo Avançado e Limpar Filtros */}
                        <div className="flex items-center justify-center gap-3">
                            <button
                                onClick={() => setAdvancedMode(!advancedMode)}
                                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-all duration-300 ${
                                    advancedMode
                                        ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-md'
                                        : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-md'
                                }`}
                            >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                                </svg>
                                {advancedMode ? 'Básico' : 'Avançado'}
                            </button>
                            
                            {/* Botão Limpar Filtros */}
                            <button
                                onClick={() => {
                                    setSearchTerm('');
                                    setSearchCode('');
                                    setSearchService('');
                                    setSearchCnaeCode('');
                                    setSearchCnaeDesc('');
                                    setShowResults(false);
                                }}
                                disabled={!(searchTerm || searchCode || searchService || searchCnaeCode || searchCnaeDesc)}
                                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-all duration-300 ${
                                    !(searchTerm || searchCode || searchService || searchCnaeCode || searchCnaeDesc)
                                        ? (darkMode 
                                            ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                                            : 'bg-gray-200 text-gray-400 cursor-not-allowed')
                                        : (darkMode
                                            ? 'bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white shadow-md'
                                            : 'bg-gradient-to-r from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600 text-white shadow-md')
                                }`}
                            >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Limpar Filtros
                            </button>

                        </div>
                    </div>

                    {!advancedMode && (
                        <div className="space-y-4">
                            {/* Campo de busca principal mais compacto */}
                            <div className="relative group">
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Digite para buscar serviços, códigos ou CNAEs..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className={`w-full pl-4 pr-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 transition-all duration-300 text-base ${
                                            darkMode 
                                                ? 'bg-gray-700 border-gray-600 focus:border-blue-500 focus:ring-blue-500/20 text-white placeholder-gray-400' 
                                                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 text-gray-900 placeholder-gray-500'
                                        }`}
                                    />

                                </div>
                            </div>
                        </div>
                    )}

                    {advancedMode && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 advanced-grid-mobile">
                                <div className="space-y-3">
                                    <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                        </svg>
                                        Código do Item
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Ex: 1.01"
                                            value={searchCode}
                                            onChange={(e) => setSearchCode(e.target.value)}
                                            className={`w-full pl-4 pr-6 py-4 border-2 rounded-xl focus:outline-none focus:ring-4 transition-all duration-300 ${
                                                darkMode ? 'bg-gray-700 border-gray-600 focus:border-blue-500 focus:ring-blue-500/20 text-white placeholder-gray-400' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 text-gray-900 placeholder-gray-500'
                                            }`}
                                        />

                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        Descrição do Serviço
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Digite parte da descrição"
                                            value={searchService}
                                            onChange={(e) => setSearchService(e.target.value)}
                                            className={`w-full pl-4 pr-6 py-4 border-2 rounded-xl focus:outline-none focus:ring-4 transition-all duration-300 ${
                                                darkMode ? 'bg-gray-700 border-gray-600 focus:border-blue-500 focus:ring-blue-500/20 text-white placeholder-gray-400' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 text-gray-900 placeholder-gray-500'
                                            }`}
                                        />

                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                        </svg>
                                        Código CNAE
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Ex: 61"
                                            value={searchCnaeCode}
                                            onChange={(e) => setSearchCnaeCode(e.target.value.replace(/[^0-9]/g, ''))}
                                            className={`w-full pl-4 pr-6 py-4 border-2 rounded-xl focus:outline-none focus:ring-4 transition-all duration-300 ${
                                                darkMode ? 'bg-gray-700 border-gray-600 focus:border-blue-500 focus:ring-blue-500/20 text-white placeholder-gray-400' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 text-gray-900 placeholder-gray-500'
                                            }`}
                                        />

                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        Descrição do CNAE
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Parte da descrição"
                                            value={searchCnaeDesc}
                                            onChange={(e) => setSearchCnaeDesc(e.target.value)}
                                            className={`w-full pl-4 pr-6 py-4 border-2 rounded-xl focus:outline-none focus:ring-4 transition-all duration-300 ${
                                                darkMode ? 'bg-gray-700 border-gray-600 focus:border-blue-500 focus:ring-blue-500/20 text-white placeholder-gray-400' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 text-gray-900 placeholder-gray-500'
                                            }`}
                                        />

                                    </div>
                                </div>
                            </div>
                            


                        </div>
                    )}

                    {isLoading && (
                        <div className="mt-8 flex justify-center">
                            <div className="relative">
                                <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
                                <div className="absolute inset-0 animate-ping rounded-full h-16 w-16 border-2 border-blue-400"></div>
                            </div>
                        </div>
                    )}
                </div>
                )}

                {/* Results Header - Só exibe se há dados filtrados */}
                {filteredData.length > 0 && (
                <div className={`${darkMode ? 'bg-gray-800/90' : 'bg-white/90'} backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden border border-gray-200/50 card-modern mb-6 animate-fadeInUp`} style={{animationDelay: '1.2s'}}>
                    <div className="px-6 py-4 border-b flex justify-between items-center bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white results-header-mobile">
                        <h2 className="text-xl font-semibold flex items-center">
                            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            Painel de Servicos
                        </h2>
                        <div className="flex gap-3 items-center">
                            <span className="text-sm bg-white bg-opacity-20 backdrop-filter backdrop-blur-sm px-4 py-2 rounded-full flex items-center gap-2">
                                <div className="status-indicator status-active"></div>
                                {filteredData.length} resultados
                            </span>
                        </div>
                    </div>

                    {noResults ? (
                        <div className="text-center py-16 animate-fadeInUp">
                            <svg className="mx-auto h-16 w-16 text-gray-400 mb-4 animate-pulse-custom" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.47-.881-6.08-2.33" />
                            </svg>
                            <h3 className={`text-lg font-medium ${darkMode ? 'text-gray-300' : 'text-gray-900'} mb-2`}>
                                Nenhum resultado encontrado
                            </h3>
                            <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'} mb-4`}>
                                Tente ajustar o termo de pesquisa ou usar filtros diferentes.
                            </p>
                            
                        </div>
                    ) : (
                        <div className="animate-fadeInUp">
                            {/* Table View - Condicionalmente renderizada */}
                            {showResults && (
                                <div className="overflow-x-auto custom-scrollbar px-6" style={{maxHeight: '70vh', overflowY: 'auto'}}>
                                    <table className={`min-w-full ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                                    <thead className={`sticky top-0 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} z-10`}>
                                        <tr>
                                            <th className={`px-4 py-3 text-center text-xs font-medium uppercase tracking-wider ${
                                                darkMode ? 'text-gray-300 border-gray-600' : 'text-gray-500 border-gray-200'
                                            } border-b`}>
                                                Código do Item
                                            </th>
                                            <th className={`px-4 py-3 text-center text-xs font-medium uppercase tracking-wider ${
                                                darkMode ? 'text-gray-300 border-gray-600' : 'text-gray-500 border-gray-200'
                                            } border-b`}>
                                                Descrição do Serviço
                                            </th>
                                            <th className={`px-4 py-3 text-center text-xs font-medium uppercase tracking-wider ${
                                                darkMode ? 'text-gray-300 border-gray-600' : 'text-gray-500 border-gray-200'
                                            } border-b`}>
                                                CNAE
                                            </th>
                                            <th className={`px-4 py-3 text-center text-xs font-medium uppercase tracking-wider ${
                                                darkMode ? 'text-gray-300 border-gray-600' : 'text-gray-500 border-gray-200'
                                            } border-b`}>
                                                Descrição CNAE
                                            </th>
                                            <th className={`px-4 py-3 text-center text-xs font-medium uppercase tracking-wider ${
                                                darkMode ? 'text-gray-300 border-gray-600' : 'text-gray-500 border-gray-200'
                                            } border-b`}>
                                                Alíquota ISS
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className={`divide-y ${darkMode ? 'divide-gray-600' : 'divide-gray-200'}`}>
                                        {filteredData.slice(0, 100).map((item, index) => (
                                            <tr key={index} className={`hover:${darkMode ? 'bg-gray-700' : 'bg-gray-50'} transition-all duration-300 hover:scale-[1.02]`}>
                                                <td className={`px-4 py-4 whitespace-nowrap text-sm text-center ${
                                                    darkMode ? 'text-blue-300' : 'text-blue-600'
                                                } font-medium`}>
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                        darkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'
                                                    }`}>
                                                        {item["LIST LC"].replace(/^0+/, '') || item["LIST LC"]}
                                                    </span>
                                                </td>
                                                <td className={`px-4 py-4 text-sm text-center ${
                                                    darkMode ? 'text-gray-300' : 'text-gray-900'
                                                } max-w-xs`}>
                                                    <div className="line-clamp-3">
                                                        {item["Descrição item da lista da Lei Complementar nº 001/2003 - CTM"]}
                                                    </div>
                                                </td>
                                                <td className={`px-4 py-4 whitespace-nowrap text-sm text-center ${
                                                    darkMode ? 'text-green-300' : 'text-green-600'
                                                } font-medium`}>
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                        darkMode ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800'
                                                    }`}>
                                                        {(() => {
                                                            const cnae = item["CNAE"].toString().replace(/[^0-9]/g, '');
                                                            if (cnae.length >= 7) {
                                                                const paddedCnae = cnae.padStart(7, '0');
                                                                return `${paddedCnae.slice(0, 4)}-${paddedCnae.slice(4, 5)}/${paddedCnae.slice(5, 7)}`;
                                                            }
                                                            return item["CNAE"];
                                                        })()} 
                                                    </span>
                                                </td>
                                                <td className={`px-4 py-4 text-sm text-center ${
                                                    darkMode ? 'text-gray-300' : 'text-gray-900'
                                                } max-w-xs`}>
                                                    <div className="line-clamp-3">
                                                        {item["Descrição do CNAE"]}
                                                    </div>
                                                </td>
                                                <td className={`px-4 py-4 whitespace-nowrap text-sm text-center font-bold ${
                                                    darkMode ? 'text-yellow-300' : 'text-yellow-600'
                                                }`}>
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border-2 ${
                                                        darkMode ? 'bg-yellow-900 text-yellow-200 border-yellow-600' : 'bg-yellow-100 text-yellow-800 border-yellow-400'
                                                    }`}>
                                                        {calculateAliquota(item["LIST LC"])}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            )}

                            {/* Mensagem quando a tabela está oculta - Design Limpo e Dinâmico */}
                            {!showResults && filteredData.length > 0 && (
                                <div className={`relative overflow-hidden rounded-2xl mx-4 my-8 animate-fadeInUp ${
                                    darkMode 
                                        ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50' 
                                        : 'bg-gradient-to-br from-white/80 to-gray-50/80 border border-gray-200/50 backdrop-blur-sm'
                                }`}>
                                    {/* Elemento decorativo de fundo */}
                                    <div className="absolute inset-0 opacity-5">
                                        <div className="absolute top-4 right-4 w-32 h-32 rounded-full bg-blue-500 blur-3xl"></div>
                                        <div className="absolute bottom-4 left-4 w-24 h-24 rounded-full bg-purple-500 blur-2xl"></div>
                                    </div>
                                    
                                    <div className="relative text-center py-16 px-8">
                                        {/* Ícone moderno */}
                                        <div className={`mx-auto w-20 h-20 rounded-2xl flex items-center justify-center mb-6 ${
                                            darkMode 
                                                ? 'bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/30' 
                                                : 'bg-gradient-to-br from-blue-100 to-purple-100 border border-blue-200'
                                        }`}>
                                            <svg className={`w-10 h-10 ${
                                                darkMode ? 'text-blue-400' : 'text-blue-600'
                                            }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                            </svg>
                                        </div>
                                        
                                        {/* Título elegante */}
                                        <h3 className={`text-2xl font-bold mb-3 ${
                                            darkMode 
                                                ? 'text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400' 
                                                : 'text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600'
                                        }`}>
                                            Resultados Organizados e Prontos para Consulta
                                        </h3>

                                    </div>
                                </div>
                            )}

                            {/* Pagination Info - Também condicionalmente renderizada */}
                            {showResults && filteredData.length > 100 && (
                                <div className={`mt-6 px-6 py-4 rounded-lg ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} border`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center text-sm text-gray-500">
                                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span>
                                                Mostrando os primeiros <strong>100</strong> resultados de <strong>{filteredData.length.toLocaleString()}</strong> encontrados
                                            </span>
                                        </div>
                                        <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                            Refine sua busca para ver resultados mais específicos
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                )}

                {/* Footer modernizado */}
                <footer className={`text-center mt-8 text-sm mobile-spacing animate-fadeInUp ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} style={{animationDelay: '1.4s'}}>
                    <div className="flex flex-col items-center space-y-2">
                        <p className="text-lg font-medium">© 2025 Sistema de Consulta Fiscal</p>
                        <p className="flex items-center gap-2">
                            Desenvolvido por 
                            <span className={`font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent ${darkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                                Murilo Miguel
                            </span>
                            <span className="text-2xl">🚀</span>
                        </p>
                    </div>
                </footer>
            </div>
        </div>
    );
}

console.log('Iniciando renderização do React...');
const rootElement = document.getElementById('root');
console.log('Root element:', rootElement);
if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(<App />);
    console.log('React renderizado com sucesso!');
    
    // Código de fallback removido - elemento não existe mais
} else {
    console.error('Elemento root não encontrado!');
}