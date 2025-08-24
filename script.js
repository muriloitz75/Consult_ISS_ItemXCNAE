const { useState, useEffect } = React;

// Componente de Login
function LoginForm({ onLogin, darkMode }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');
        
        // Credenciais simples (em produção, usar método mais seguro)
        if (username === 'admin' && password === '123456') {
            onLogin();
        } else {
            setError('Usuário ou senha incorretos');
        }
    };

    return (
        <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
            <div className={`max-w-md w-full space-y-8 p-8 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md`}>
                <div>
                    <h2 className={`mt-6 text-center text-3xl font-extrabold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        Sistema de Consulta ISS
                    </h2>
                    <p className={`mt-2 text-center text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        Faça login para acessar o sistema
                    </p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <input
                                type="text"
                                required
                                className={`appearance-none rounded-none relative block w-full px-3 py-2 border ${darkMode ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300 placeholder-gray-500 text-gray-900'} rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                                placeholder="Usuário"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                            />
                        </div>
                        <div>
                            <input
                                type="password"
                                required
                                className={`appearance-none rounded-none relative block w-full px-3 py-2 border ${darkMode ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300 placeholder-gray-500 text-gray-900'} rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                                placeholder="Senha"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="text-red-600 text-sm text-center">
                            {error}
                        </div>
                    )}

                    <div>
                        <button
                            type="submit"
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            Entrar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function App() {
    // Estados de autenticação
    const [isAuthenticated, setIsAuthenticated] = useState(() => {
        return localStorage.getItem('isAuthenticated') === 'true';
    });
    
    const [data, setData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [itemCode, setItemCode] = useState('');
    const [serviceDescription, setServiceDescription] = useState('');
    const [cnaeCode, setCnaeCode] = useState('');
    const [cnaeDescription, setCnaeDescription] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [darkMode, setDarkMode] = useState(() => {
        const saved = localStorage.getItem('darkMode');
        return saved ? JSON.parse(saved) : false;
    });
    const [searchMode, setSearchMode] = useState('universal'); // 'universal' ou 'advanced'
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalResults, setModalResults] = useState([]);
    const [noResults, setNoResults] = useState(false);

    // Funções de autenticação
    const handleLogin = () => {
        setIsAuthenticated(true);
        localStorage.setItem('isAuthenticated', 'true');
    };

    const handleLogout = () => {
        setIsAuthenticated(false);
        localStorage.removeItem('isAuthenticated');
    };

    useEffect(() => {
        localStorage.setItem('darkMode', JSON.stringify(darkMode));
        if (darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [darkMode]);

    useEffect(() => {
        console.log('Carregando dados XML...');
        fetch('dados.xml')
            .then(response => {
                console.log('Resposta recebida:', response.status);
                return response.text();
            })
            .then(xmlText => {
                console.log('XML carregado, tamanho:', xmlText.length);
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
                const rows = xmlDoc.querySelectorAll('TR');
                console.log('Número de linhas encontradas:', rows.length);
                
                const parsedData = Array.from(rows).map(row => {
                    const cells = row.querySelectorAll('TH, TD');
                    return {
                        "LIST LC": cells[0]?.textContent?.trim() || '',
                        "Descrição item da lista da Lei Complementar nº 001/2003 - CTM": cells[1]?.textContent?.trim() || '',
                        "CNAE": cells[2]?.textContent?.trim() || '',
                        "Descrição do CNAE": cells[3]?.textContent?.trim() || ''
                    };
                });
                
                console.log('Dados processados:', parsedData.length, 'itens');
                console.log('Primeiros 3 itens:', parsedData.slice(0, 3));
                setData(parsedData);
                setFilteredData(parsedData);
            })
            .catch(error => {
                console.error('Erro ao carregar dados:', error);
            });
    }, []);

    // Função para normalizar texto (remove espaços extras e converte para minúsculo)
    const normalizeText = (text) => {
        if (!text) return '';
        return text.toString().trim().toLowerCase();
    };

    // Função para normalizar códigos removendo zeros à esquerda
    const normalizeCode = (code) => {
        if (!code) return '';
        const cleanCode = code.toString().trim();
        
        // Se contém pontos, normaliza cada parte separadamente
        if (cleanCode.includes('.')) {
            return cleanCode.split('.').map(part => {
                // Remove zeros à esquerda de cada parte, mas mantém pelo menos um dígito
                return part.replace(/^0+/, '') || '0';
            }).join('.');
        }
        
        // Se é só números, remove zeros à esquerda
        return cleanCode.replace(/^0+/, '') || '0';
    };

    // Função para verificar se é um código (números, pontos, hífens e barras)
    const isCode = (term) => {
        return /^[\d\-\/\.]+$/.test(term.trim());
    };

    // Função para normalizar códigos CNAE para busca flexível
    const normalizeCnaeCode = (code) => {
        if (!code) return '';
        // Remove espaços, hífens e barras, mantém apenas números
        return code.toString().replace(/[\s\-\/]/g, '').trim();
    };

    // Função de busca assertiva específica para cada tipo de campo
    const assertiveSearch = (field, term, fieldType = 'generic') => {
        if (!field || !term) return false;
        
        const normalizedField = normalizeText(field);
        const normalizedTerm = normalizeText(term);
        
        console.log(`Comparando: "${normalizedField}" com "${normalizedTerm}" (tipo: ${fieldType})`); // Debug
        
        // Se o termo é um código, aplica lógica específica por tipo de campo
        if (isCode(term)) {
            // Para códigos de item da lista (LIST LC) - busca mais restritiva
            if (fieldType === 'listlc') {
                const normalizedCodeTerm = normalizeCode(normalizedTerm);
                const fieldCodeMatch = normalizedField.match(/^([\d\.\-\/]+)/);
                
                if (fieldCodeMatch) {
                    const fieldCode = normalizeCode(fieldCodeMatch[1]);
                    
                    // 1. Busca exata após normalização
                    if (fieldCode === normalizedCodeTerm) {
                        console.log(`Busca exata de LIST LC "${normalizedCodeTerm}" encontrada em "${fieldCode}": true`); // Debug
                        return true;
                    }
                    
                    // 2. Busca parcial apenas se o termo termina com ponto (ex: "7." para buscar "7.01", "7.02", etc.)
                    if (normalizedTerm.endsWith('.') && fieldCode.startsWith(normalizedCodeTerm.slice(0, -1) + '.')) {
                        console.log(`Busca parcial de LIST LC "${normalizedCodeTerm}" encontrada em "${fieldCode}": true`); // Debug
                        return true;
                    }
                    
                    // 3. Se não tem ponto no termo, busca apenas códigos que começam exatamente com o número seguido de ponto
                    if (!normalizedTerm.includes('.')) {
                        const exactPattern = new RegExp(`^${normalizedCodeTerm}\.`);
                        if (exactPattern.test(fieldCode)) {
                            console.log(`Busca de categoria LIST LC "${normalizedCodeTerm}" encontrada em "${fieldCode}": true`); // Debug
                            return true;
                        }
                    }
                }
                
                console.log(`Busca de LIST LC "${normalizedTerm}" em "${normalizedField}": false`); // Debug
                return false;
            }
            
            // Para códigos CNAE - mantém busca flexível
            if (fieldType === 'cnae') {
                const cleanTerm = normalizeCnaeCode(normalizedTerm);
                const cleanField = normalizeCnaeCode(normalizedField);
                
                // 1. Busca exata após normalização
                if (cleanField === cleanTerm) {
                    console.log(`Busca exata de CNAE "${cleanTerm}" encontrada em "${cleanField}": true`); // Debug
                    return true;
                }
                
                // 2. Busca por início do código (busca parcial)
                if (cleanField.startsWith(cleanTerm)) {
                    console.log(`Busca parcial de CNAE "${cleanTerm}" encontrada no início de "${cleanField}": true`); // Debug
                    return true;
                }
                
                console.log(`Busca de CNAE "${cleanTerm}" em "${cleanField}": false`); // Debug
                return false;
            }
            
            // Para outros códigos - busca genérica
            const normalizedCodeTerm = normalizeCode(normalizedTerm);
            const fieldCodeMatch = normalizedField.match(/^([\d\.\-\/]+)/);
            if (fieldCodeMatch) {
                const fieldCode = normalizeCode(fieldCodeMatch[1]);
                if (fieldCode === normalizedCodeTerm) {
                    console.log(`Busca exata de código "${normalizedCodeTerm}" encontrada em "${fieldCode}": true`); // Debug
                    return true;
                }
            }
            
            console.log(`Busca de código "${normalizedTerm}" em "${normalizedField}": false`); // Debug
            return false;
        } else {
            // Para descrições, busca por inclusão
            const result = normalizedField.includes(normalizedTerm);
            console.log(`Busca de descrição "${normalizedTerm}" em "${normalizedField}": ${result}`); // Debug
            return result;
        }
    };

    const filterData = () => {
        console.log('Iniciando filterData...'); // Debug
        console.log('Dados disponíveis:', data?.length || 0); // Debug
        
        if (!data || data.length === 0) {
            console.log('Nenhum dado disponível'); // Debug
            return [];
        }

        let filtered = [];

        if (searchMode === 'universal') {
            console.log('Modo Universal - Termo:', searchTerm); // Debug
            // Modo Universal: busca em todos os campos com o termo geral
            if (searchTerm.trim()) {
                filtered = data.filter(item => {
                    const match = assertiveSearch(item['LIST LC'], searchTerm, 'listlc') ||
                                 assertiveSearch(item['Descrição item da lista da Lei Complementar nº 001/2003 - CTM'], searchTerm, 'description') ||
                                 assertiveSearch(item['CNAE'], searchTerm, 'cnae') ||
                                 assertiveSearch(item['Descrição do CNAE'], searchTerm, 'description');
                    
                    if (match) {
                        console.log('Item encontrado:', item['LIST LC']); // Debug
                    }
                    return match;
                });
            } else {
                filtered = data; // Se não há termo, mostra todos
            }
        } else {
            console.log('Modo Especial'); // Debug
            // Modo Especial: aplica filtros específicos
            filtered = data;
            
            if (itemCode.trim()) {
                console.log('Filtrando por código do item:', itemCode); // Debug
                filtered = filtered.filter(item => assertiveSearch(item['LIST LC'], itemCode, 'listlc'));
            }
            if (serviceDescription.trim()) {
                console.log('Filtrando por descrição do serviço:', serviceDescription); // Debug
                filtered = filtered.filter(item => assertiveSearch(item['Descrição item da lista da Lei Complementar nº 001/2003 - CTM'], serviceDescription, 'description'));
            }
            if (cnaeCode.trim()) {
                console.log('Filtrando por código CNAE:', cnaeCode); // Debug
                filtered = filtered.filter(item => assertiveSearch(item['CNAE'], cnaeCode, 'cnae'));
            }
            if (cnaeDescription.trim()) {
                console.log('Filtrando por descrição CNAE:', cnaeDescription); // Debug
                filtered = filtered.filter(item => assertiveSearch(item['Descrição do CNAE'], cnaeDescription, 'description'));
            }
        }

        console.log('Resultados filtrados:', filtered.length); // Debug
        return filtered;
    };

    const calculateAliquota = (listLC) => {
        console.log('Calculando alíquota para LIST LC:', listLC);
        const code = parseInt(listLC.replace(/[^0-9]/g, ''));
        console.log('Código numérico extraído:', code);
        
        if (code >= 1 && code <= 100) {
            console.log('Alíquota: 5%');
            return '5%';
        } else if (code >= 101 && code <= 199) {
            console.log('Alíquota: 3%');
            return '3%';
        } else if (code >= 200 && code <= 299) {
            console.log('Alíquota: 2%');
            return '2%';
        } else {
            console.log('Alíquota: 5% (padrão)');
            return '5%';
        }
    };

    const handleSearch = () => {
        setIsLoading(true);
        
        setTimeout(() => {
            const results = filterData();
            setModalResults(results);
            setNoResults(results.length === 0);
            setIsModalOpen(true);
            setIsLoading(false);
        }, 500);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setModalResults([]);
        setNoResults(false);
    };

    const clearFilters = () => {
        setSearchTerm('');
        setItemCode('');
        setServiceDescription('');
        setCnaeCode('');
        setCnaeDescription('');
        setFilteredData(data);
    };

    // Renderização condicional baseada na autenticação
    if (!isAuthenticated) {
        return <LoginForm onLogin={handleLogin} darkMode={darkMode} />;
    }

    return (
        <div className={`min-h-screen transition-all duration-500 ${darkMode ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50'}`}>
            <div className="container mx-auto px-4 py-8 max-w-6xl">
                <header className="text-center mb-12 animate-fadeInDown">
                    <div className="flex justify-center items-center mb-6">
                        <div className="relative">
                            <div className={`w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transform hover:scale-110 transition-all duration-300 ${darkMode ? 'bg-gradient-to-r from-blue-600 to-purple-600' : 'bg-gradient-to-r from-blue-500 to-purple-600'}`}>
                                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.47-.881-6.08-2.33" />
                                </svg>
                            </div>
                            <div className={`absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${darkMode ? 'bg-green-500 text-white' : 'bg-green-400 text-white'} animate-pulse`}>
                                ✓
                            </div>
                        </div>
                    </div>
                    <h1 className={`text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent ${darkMode ? 'text-white' : ''}`}>
                        Consulta Lista/Cnae/Alíquota
                    </h1>
                    <p className={`text-xl mb-6 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        Consulte itens da Lista de Serviços e suas respectivas alíquotas do ISS
                    </p>
                    <div className={`inline-flex items-center px-6 py-3 rounded-full text-sm font-medium ${darkMode ? 'bg-blue-900 text-blue-200 border border-blue-700' : 'bg-blue-100 text-blue-800 border border-blue-200'} animate-pulse-custom`}>
                        <div className="status-indicator status-active mr-2"></div>
                        Sistema Online • {data.length} itens carregados
                    </div>
                </header>

                <div className="flex justify-between items-center mb-6">
                    <button
                        onClick={handleLogout}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 transform hover:scale-105 ${darkMode ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-red-500 hover:bg-red-600 text-white'} shadow-lg`}
                        title="Sair do Sistema"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sair
                    </button>
                    <button
                        onClick={() => setDarkMode(!darkMode)}
                        className={`p-3 rounded-full transition-all duration-300 transform hover:scale-110 ${darkMode ? 'bg-yellow-500 text-gray-900 hover:bg-yellow-400' : 'bg-gray-800 text-yellow-400 hover:bg-gray-700'} shadow-lg`}
                        title={darkMode ? 'Modo Claro' : 'Modo Escuro'}
                    >
                        {darkMode ? (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                        ) : (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                            </svg>
                        )}
                    </button>
                </div>

                <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-2xl shadow-2xl border backdrop-blur-sm p-8 mb-8 animate-fadeInUp`} style={{animationDelay: '0.2s'}}>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'} flex items-center`}>
                            Pesquisa Assertiva
                        </h2>
                        <button
                            onClick={clearFilters}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'} flex items-center gap-2`}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Limpar Filtros
                        </button>
                    </div>
                    
                    {/* Toggle de Modo de Pesquisa */}
                    <div className="flex justify-center mb-8">
                        <div className={`inline-flex rounded-xl p-1 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                            <button
                                onClick={() => setSearchMode('universal')}
                                className={`px-6 py-3 rounded-lg text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                                    searchMode === 'universal'
                                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg transform scale-105'
                                        : darkMode
                                        ? 'text-gray-300 hover:text-white hover:bg-gray-600'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                                }`}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                Universal
                            </button>
                            <button
                                onClick={() => setSearchMode('advanced')}
                                className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 flex items-center gap-2 ${
                                    searchMode === 'advanced'
                                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg transform scale-105'
                                        : `${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} hover:shadow-md`
                                }`}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                                </svg>
                                Especial
                            </button>
                        </div>
                    </div>
                    
                    <div className={`grid gap-6 mb-6 transition-all duration-500 ${searchMode === 'universal' ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2'}`}>
                        {/* Campo de Pesquisa Universal - Mostrar apenas no modo universal */}
                        {searchMode === 'universal' && (
                            <div className="space-y-2">
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Digite qualquer termo para buscar em todos os campos..."
                                        className={`w-full pl-4 pr-4 py-3 rounded-lg border transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Campos Especiais - Mostrar apenas no modo especial */}
                        {searchMode === 'advanced' && (
                            <>
                                <div className="space-y-2 animate-fadeInUp">
                                    <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                        Código do Item
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={itemCode}
                                            onChange={(e) => setItemCode(e.target.value)}
                                            placeholder="Ex: 01.01, 02.05..."
                                            className={`w-full pl-10 pr-4 py-3 rounded-lg border transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
                                        />
                                        <svg className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                                        </svg>
                                    </div>
                                </div>

                                <div className="space-y-2 animate-fadeInUp" style={{animationDelay: '0.1s'}}>
                                    <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                        Descrição do Serviço
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={serviceDescription}
                                            onChange={(e) => setServiceDescription(e.target.value)}
                                            placeholder="Ex: análise, desenvolvimento..."
                                            className={`w-full pl-10 pr-4 py-3 rounded-lg border transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
                                        />
                                        <svg className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.47-.881-6.08-2.33" />
                                        </svg>
                                    </div>
                                </div>

                                <div className="space-y-2 animate-fadeInUp" style={{animationDelay: '0.2s'}}>
                                    <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                        Código CNAE
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={cnaeCode}
                                            onChange={(e) => setCnaeCode(e.target.value)}
                                            placeholder="Ex: 6201, 6201-5, 620150, 7020..."
                                            className={`w-full pl-10 pr-4 py-3 rounded-lg border transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
                                        />
                                        <svg className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                        </svg>
                                    </div>
                                </div>

                                <div className="space-y-2 animate-fadeInUp" style={{animationDelay: '0.3s'}}>
                                    <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                        Descrição CNAE
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={cnaeDescription}
                                            onChange={(e) => setCnaeDescription(e.target.value)}
                                            placeholder="Ex: desenvolvimento de programas..."
                                            className={`w-full pl-10 pr-4 py-3 rounded-lg border transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
                                        />
                                        <svg className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                                        </svg>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="flex justify-center">
                        <button
                            onClick={handleSearch}
                            disabled={isLoading}
                            className={`px-8 py-4 rounded-xl font-semibold text-white transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-green-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 ${isLoading ? 'bg-gray-500' : 'bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 shadow-lg hover:shadow-xl'}`}
                        >
                            {isLoading ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                                    Pesquisando...
                                </>
                            ) : (
                                <>
                                    Realizar Consulta
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {isLoading && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} p-8 rounded-2xl shadow-2xl flex flex-col items-center`}>
                            <div className="relative mb-4">
                                <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
                                <div className="absolute inset-0 animate-ping rounded-full h-16 w-16 border-2 border-blue-400"></div>
                            </div>
                            <p className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>Processando consulta...</p>
                            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mt-2`}>Aguarde um momento</p>
                        </div>
                    </div>
                )}

                {isModalOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div 
                            className="absolute inset-0 backdrop-blur-sm" 
                            onClick={closeModal}
                        ></div>
                        
                        <div className={`relative w-full max-w-7xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                            <div className="px-6 py-4 border-b flex justify-between items-center bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white">
                                <h2 className="text-xl font-semibold flex items-center">
                                    <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                    Resultados da Consulta
                                </h2>
                                <div className="flex gap-3 items-center">
                                    <span className="text-sm bg-white bg-opacity-20 backdrop-filter backdrop-blur-sm px-4 py-2 rounded-full flex items-center gap-2">
                                        <div className="status-indicator status-active"></div>
                                        {modalResults.length} resultados
                                    </span>
                                    <button 
                                        onClick={closeModal}
                                        className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-all duration-200"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
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
                                                {modalResults.slice(0, 100).map((item, index) => (
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
                                    
                                    <div className={`px-6 py-4 border-t ${
                                        darkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-gray-50'
                                    } rounded-b-lg`}>
                                        <div className="flex items-center justify-between">
                                            <div className={`text-sm ${
                                                darkMode ? 'text-gray-400' : 'text-gray-600'
                                            }`}>
                                                <span className="font-medium">
                                                    Mostrando {Math.min(100, modalResults.length)} de {modalResults.length} resultado{modalResults.length !== 1 ? 's' : ''}
                                                </span>
                                                {modalResults.length > 100 && (
                                                    <span className={`ml-2 text-xs px-2 py-1 rounded-full ${
                                                        darkMode ? 'bg-yellow-900 text-yellow-200' : 'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                        Primeiros 100 resultados
                                                    </span>
                                                )}
                                            </div>
                                            <div className={`text-xs ${
                                                darkMode ? 'text-gray-500' : 'text-gray-500'
                                            }`}>
                                                💡 Refine sua busca para resultados mais específicos
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

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
} else {
    console.error('Elemento root não encontrado!');
}