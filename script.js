const { useState, useEffect, useRef } = React;

// Error Boundary para exibir erros de renderização
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, info) {
        console.error('ErrorBoundary:', error, info);
    }
    render() {
        if (this.state.hasError && this.state.error) {
            return (
                <div style={{ fontFamily: 'system-ui', maxWidth: 560, margin: '2rem auto', padding: '2rem', textAlign: 'center', background: '#fef2f2', border: '2px solid #fecaca', borderRadius: 16 }}>
                    <h1 style={{ color: '#991b1b', marginBottom: '1rem' }}>Erro na aplicação</h1>
                    <p style={{ color: '#b91c1c', marginBottom: '1rem', wordBreak: 'break-word' }}>{this.state.error.message}</p>
                    <button onClick={() => this.setState({ hasError: false, error: null })} style={{ padding: '8px 16px', borderRadius: 8, background: '#dc2626', color: 'white', border: 'none', cursor: 'pointer' }}>Tentar novamente</button>
                </div>
            );
        }
        return this.props.children;
    }
}

// 🔐 Sistema de Gerenciamento de Credenciais

// Utilitários de Hash (simulação para ambiente cliente)
const CryptoUtils = {
    // Simulação de hash simples para ambiente cliente
    hashPassword: (password) => {
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash).toString(16);
    },

    comparePassword: (password, hash) => {
        return CryptoUtils.hashPassword(password) === hash;
    }
};

// Regras de validação de senha
const passwordRules = {
    minLength: 8,
    maxLength: 50,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    preventReuse: 5,
    specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?'
};

// Validador de Credenciais
class CredentialValidator {
    static validateUsername(username) {
        const errors = [];

        if (!username || username.length < 3) {
            errors.push('Nome de usuário deve ter pelo menos 3 caracteres');
        }

        if (username.length > 20) {
            errors.push('Nome de usuário deve ter no máximo 20 caracteres');
        }

        if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
            errors.push('Nome de usuário deve conter apenas letras, números, _ ou -');
        }

        const reservedUsernames = ['admin', 'root', 'system', 'null', 'undefined'];
        if (reservedUsernames.includes(username.toLowerCase())) {
            errors.push('Este nome de usuário é reservado');
        }

        return { isValid: errors.length === 0, errors };
    }

    static validatePassword(password) {
        const errors = [];

        if (!password || password.length < passwordRules.minLength) {
            errors.push(`A senha deve ter pelo menos ${passwordRules.minLength} caracteres`);
        }

        if (password.length > passwordRules.maxLength) {
            errors.push(`A senha deve ter no máximo ${passwordRules.maxLength} caracteres`);
        }

        if (passwordRules.requireUppercase && !/[A-Z]/.test(password)) {
            errors.push('A senha deve conter pelo menos uma letra maiúscula');
        }

        if (passwordRules.requireLowercase && !/[a-z]/.test(password)) {
            errors.push('A senha deve conter pelo menos uma letra minúscula');
        }

        if (passwordRules.requireNumbers && !/\d/.test(password)) {
            errors.push('A senha deve conter pelo menos um número');
        }

        if (passwordRules.requireSpecialChars) {
            const specialCharsRegex = new RegExp(`[${passwordRules.specialChars.replace(/[\-\[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}]`);
            if (!specialCharsRegex.test(password)) {
                errors.push('A senha deve conter pelo menos um caractere especial');
            }
        }

        return { isValid: errors.length === 0, errors };
    }

    static generatePasswordStrengthScore(password) {
        let score = 0;

        if (password.length >= 8) score++;
        if (password.length >= 12) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[a-z]/.test(password)) score++;
        if (/\d/.test(password)) score++;
        if (new RegExp(`[${passwordRules.specialChars.replace(/[\-\[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}]`).test(password)) score++;

        return Math.min(score, 5);
    }

    static checkUsernameAvailability(username, currentUserId, users) {
        return !users.some(user => user.username === username && user.id !== currentUserId);
    }
}

// Gerenciador de Usuários
// API Service para comunicar com o backend Node.js
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3001/api'
    : '/api'; // Para quando for deployado junto no Railway

class ApiService {
    static async request(endpoint, options = {}) {
        const token = localStorage.getItem('authToken');

        const headers = {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers
        };

        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                ...options,
                headers
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(data.error || 'Erro na requisição');
            }

            return data;
        } catch (error) {
            console.error(`API Error (${endpoint}):`, error);
            throw error;
        }
    }

    static async login(username, password) {
        const response = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });

        localStorage.setItem('authToken', response.token);
        localStorage.setItem('currentUser', JSON.stringify(response.user));
        return response.user;
    }

    static async register(userData) {
        return this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    static async forgotPassword(username) {
        return this.request('/auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ username })
        });
    }

    static async updateProfile(profileData) {
        const response = await this.request('/auth/profile', {
            method: 'PUT',
            body: JSON.stringify(profileData)
        });

        localStorage.setItem('currentUser', JSON.stringify(response.user));
        return response;
    }

    static logout() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
    }

    // --- Métodos de Admin ---
    static async getUsers() {
        return this.request('/auth/users', {
            method: 'GET'
        });
    }

    static async authorizeUser(userId) {
        return this.request(`/auth/users/${userId}/authorize`, {
            method: 'POST'
        });
    }

    static async toggleUserBlock(userId) {
        return this.request(`/auth/users/${userId}/block`, {
            method: 'POST'
        });
    }

    static async resetUserPassword(userId) {
        return this.request(`/auth/users/${userId}/reset-password`, {
            method: 'POST'
        });
    }

    static async deleteUser(userId) {
        return this.request(`/auth/users/${userId}`, {
            method: 'DELETE'
        });
    }

    // --- Métodos de Banners ---
    static async getBanners() {
        // Chama sem auth para funcionar tanto pra admin quanto pra usuário
        const response = await fetch(`${API_BASE_URL}/banners`);
        if (!response.ok) throw new Error('Erro ao carregar banners');
        return response.json();
    }

    static async toggleBanner(id, enabled) {
        return this.request(`/admin/banners/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ enabled })
        });
    }

    static async reorderBanners(orderedBanners) {
        return this.request(`/admin/banners/reorder`, {
            method: 'PUT',
            body: JSON.stringify({ orderedBanners })
        });
    }

    static getCurrentUser() {
        try {
            return JSON.parse(localStorage.getItem('currentUser'));
        } catch (e) {
            return null;
        }
    }
}

// Componente de Perfil do Usuário
function UserProfilePage({ user, onLogout, onCredentialsChanged, darkMode }) {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        name: user.name || '',
        email: user.email || '',
        username: user.username || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [showPasswordFields, setShowPasswordFields] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));

        // Limpar erro específico quando usuário começa a digitar
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }

        // Limpar mensagem de sucesso
        if (successMessage) {
            setSuccessMessage('');
        }
    };

    const validateForm = () => {
        const newErrors = {};

        // Validar nome
        if (!formData.name.trim()) {
            newErrors.name = 'Nome é obrigatório';
        }

        // Validar email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!formData.email.trim()) {
            newErrors.email = 'Email é obrigatório';
        } else if (!emailRegex.test(formData.email)) {
            newErrors.email = 'Email inválido';
        }

        // Validar username básico
        const usernameValidation = CredentialValidator.validateUsername(formData.username);
        if (!usernameValidation.isValid) {
            newErrors.username = usernameValidation.errors[0];
        }

        // Se alterando senha
        if (showPasswordFields) {
            // Validar senha atual
            if (!formData.currentPassword) {
                newErrors.currentPassword = 'Senha atual é obrigatória';
            } else if (!CryptoUtils.comparePassword(formData.currentPassword, user.password)) {
                newErrors.currentPassword = 'Senha atual incorreta';
            }

            // Validar nova senha
            if (formData.newPassword) {
                const passwordValidation = CredentialValidator.validatePassword(formData.newPassword);
                if (!passwordValidation.isValid) {
                    newErrors.newPassword = passwordValidation.errors[0];
                }
            }

            // Validar confirmação de senha
            if (formData.newPassword !== formData.confirmPassword) {
                newErrors.confirmPassword = 'Senhas não coincidem';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setIsLoading(true);

        try {
            const updates = {
                name: formData.name,
                email: formData.email,
                username: formData.username
            };

            // Se alterando senha
            if (showPasswordFields && formData.newPassword) {
                updates.newPassword = formData.newPassword;
                updates.currentPassword = formData.currentPassword;
            }

            // Atualizar usuário
            const response = await ApiService.updateProfile(updates);
            const updatedUser = response.user;

            if (updatedUser) {

                setSuccessMessage('Perfil atualizado com sucesso!');
                setIsEditing(false);
                setShowPasswordFields(false);
                setFormData(prev => ({
                    ...prev,
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: ''
                }));

                // Notificar componente pai sobre a alteração
                if (onCredentialsChanged) {
                    onCredentialsChanged(updatedUser);
                }
            } else {
                setErrors({ general: 'Erro ao atualizar perfil. Tente novamente.' });
            }
        } catch (error) {
            console.error('Erro ao atualizar perfil:', error);
            setErrors({ general: 'Erro interno. Tente novamente.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
        setIsEditing(false);
        setShowPasswordFields(false);
        setFormData({
            name: user.name || '',
            email: user.email || '',
            username: user.username || '',
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
        });
        setErrors({});
        setSuccessMessage('');
    };

    const inputBase = `w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 focus:ring-2 focus:ring-offset-0 focus:outline-none ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500/30' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500/20'}`;
    const inputError = 'border-red-500 focus:border-red-500 focus:ring-red-500/30';

    return (
        <div className={`rounded-3xl overflow-hidden animate-fadeInUp shadow-2xl ${darkMode ? 'bg-gray-800 border-gray-700/50' : 'bg-white border-gray-100'} border`}>
            {/* Cabeçalho Premium com glassmorphism e glow */}
            <div className={`relative py-12 px-8 overflow-hidden ${darkMode ? 'bg-gradient-to-r from-gray-900 via-blue-900/40 to-gray-900' : 'bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700'}`}>
                <div className="absolute inset-0 bg-white opacity-5 mix-blend-overlay pointer-events-none"></div>
                {/* Glow effects */}
                <div className="absolute top-0 left-1/4 w-64 h-64 bg-blue-500/30 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-pulse"></div>
                <div className="absolute top-0 right-1/4 w-64 h-64 bg-purple-500/30 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-pulse" style={{ animationDelay: '2s' }}></div>

                <div className="relative flex flex-col md:flex-row items-center gap-8 z-10 max-w-5xl mx-auto">
                    <div className="relative group">
                        <div className={`absolute -inset-0.5 rounded-full blur opacity-50 group-hover:opacity-100 transition duration-500 ${darkMode ? 'bg-gradient-to-r from-blue-400 to-purple-500' : 'bg-gradient-to-r from-white/50 to-white/30'}`}></div>
                        <div className={`relative w-28 h-28 rounded-full flex items-center justify-center text-5xl font-extrabold shadow-2xl ring-4 ${darkMode ? 'ring-gray-800 bg-gray-900 text-transparent bg-clip-text bg-gradient-to-br from-blue-400 to-purple-400' : 'ring-white/40 bg-white/20 backdrop-blur-md text-white'}`}>
                            {(user.name || user.username || 'U').charAt(0).toUpperCase()}
                        </div>
                    </div>

                    <div className="flex-1 text-center md:text-left">
                        <h2 className={`text-3xl sm:text-4xl font-extrabold tracking-tight drop-shadow-sm ${darkMode ? 'text-white' : 'text-white'}`}>
                            {user.name || user.username || 'Meu Perfil'}
                        </h2>
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-4">
                            <span className={`px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md border ${user.role === 'admin' ? (darkMode ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-amber-400/30 text-amber-50 border-amber-300/50') : (darkMode ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' : 'bg-blue-400/30 text-blue-50 border-blue-300/50')}`}>
                                {user.role === 'admin' ? 'Administrador' : 'Usuário'}
                            </span>
                            <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-blue-100'}`}>
                                @{user.username}
                            </span>
                        </div>
                    </div>

                    <div>
                        <button
                            onClick={onLogout}
                            className={`group relative inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-300 overflow-hidden shadow-lg backdrop-blur-md border ${darkMode ? 'bg-gray-800/50 hover:bg-red-500/20 text-gray-300 hover:text-red-400 border-gray-700 hover:border-red-500/30' : 'bg-white/10 hover:bg-white text-white hover:text-red-600 border-white/30 hover:border-white shadow-[0_0_15px_rgba(255,255,255,0.1)]'}`}
                        >
                            <span className="relative z-10 flex items-center gap-2">
                                <svg className={`w-5 h-5 transition-transform group-hover:-translate-x-1`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                Desconectar
                            </span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Mensagens de feedback */}
            {successMessage && (
                <div className={`mx-6 mt-6 p-4 rounded-xl flex items-center gap-3 ${darkMode ? 'bg-green-900/30 border border-green-700 text-green-300' : 'bg-green-50 border border-green-200 text-green-800'}`}>
                    <svg className="w-5 h-5 flex-shrink-0 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium">{successMessage}</span>
                </div>
            )}
            {errors.general && (
                <div className={`mx-6 mt-6 p-4 rounded-xl flex items-center gap-3 ${darkMode ? 'bg-red-900/30 border border-red-700 text-red-300' : 'bg-red-50 border border-red-200 text-red-800'}`}>
                    <svg className="w-5 h-5 flex-shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium">{errors.general}</span>
                </div>
            )}

            {/* Conteúdo: informações ou formulário */}
            <div className={`p-8 ${darkMode ? 'bg-gray-800/50' : 'bg-gray-50/50'}`}>
                {!isEditing ? (
                    <div className="animate-fadeIn">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                            <h3 className={`text-xl font-bold flex items-center gap-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                                <div className={`p-2 rounded-lg ${darkMode ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                </div>
                                Dados da Conta
                            </h3>
                            <button
                                onClick={() => setIsEditing(true)}
                                className={`inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-semibold transition-all duration-300 transform hover:-translate-y-0.5 shadow-md hover:shadow-lg ${darkMode ? 'bg-blue-600 hover:bg-blue-500 text-white border-none' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-none'}`}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Editar Perfil
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {[
                                { label: 'Nome Completo', value: user.name || 'Não informado', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', color: 'blue' },
                                { label: 'Endereço de Email', value: user.email || 'Não informado', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', color: 'purple' },
                                { label: 'Nome de Usuário', value: '@' + user.username, icon: 'M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z', color: 'indigo' },
                                { label: 'Último Acesso', value: user.lastLogin ? new Date(user.lastLogin).toLocaleString('pt-BR') : 'Primeiro acesso', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', color: 'emerald' },
                                { label: 'Modificação de Senha', value: user.lastPasswordChange ? new Date(user.lastPasswordChange).toLocaleString('pt-BR') : 'Nunca alterada', icon: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z', color: 'amber' }
                            ].map((item, i) => {
                                const colors = {
                                    blue: darkMode ? 'bg-blue-900/30 text-blue-400 border-blue-800/50' : 'bg-blue-50 text-blue-600 border-blue-100',
                                    purple: darkMode ? 'bg-purple-900/30 text-purple-400 border-purple-800/50' : 'bg-purple-50 text-purple-600 border-purple-100',
                                    indigo: darkMode ? 'bg-indigo-900/30 text-indigo-400 border-indigo-800/50' : 'bg-indigo-50 text-indigo-600 border-indigo-100',
                                    emerald: darkMode ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800/50' : 'bg-emerald-50 text-emerald-600 border-emerald-100',
                                    amber: darkMode ? 'bg-amber-900/30 text-amber-400 border-amber-800/50' : 'bg-amber-50 text-amber-600 border-amber-100',
                                };
                                const iconClass = colors[item.color];

                                return (
                                    <div key={i} className={`p-6 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${darkMode ? 'bg-gray-800/60 border-gray-700/50 hover:border-gray-600 hover:bg-gray-800/90' : 'bg-white border-gray-100 hover:border-gray-200 shadow-sm hover:shadow-md'}`}>
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 border ${iconClass}`}>
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} /></svg>
                                        </div>
                                        <p className={`text-xs font-bold uppercase tracking-wider mb-1.5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{item.label}</p>
                                        <p className={`font-semibold text-lg truncate ${darkMode ? 'text-gray-200' : 'text-gray-800'}`} title={item.value}>{item.value}</p>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="animate-fadeIn">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className={`text-xl font-bold flex items-center gap-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                                <div className={`p-2 rounded-lg ${darkMode ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                </div>
                                Editar Informações
                            </h3>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-8">
                            {/* Secao de dados basicos */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className={`block text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Nome Completo</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <svg className={`h-5 w-5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                        </div>
                                        <input type="text" value={formData.name} onChange={(e) => handleInputChange('name', e.target.value)} disabled={isLoading}
                                            className={`pl-11 ${inputBase} ${errors.name ? inputError : ''}`} placeholder="Seu nome completo" />
                                    </div>
                                    {errors.name && <p className="text-sm font-medium text-red-500 animate-fadeIn">{errors.name}</p>}
                                </div>
                                <div className="space-y-2">
                                    <label className={`block text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Endereço de Email</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <svg className={`h-5 w-5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                        </div>
                                        <input type="email" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} disabled={isLoading}
                                            className={`pl-11 ${inputBase} ${errors.email ? inputError : ''}`} placeholder="seu@email.com" />
                                    </div>
                                    {errors.email && <p className="text-sm font-medium text-red-500 animate-fadeIn">{errors.email}</p>}
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className={`block text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Nome de Usuário</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <svg className={`h-5 w-5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        </div>
                                        <input type="text" value={formData.username} onChange={(e) => handleInputChange('username', e.target.value)} disabled={isLoading}
                                            className={`pl-11 ${inputBase} ${errors.username ? inputError : ''}`} placeholder="usuario" />
                                    </div>
                                    {errors.username && <p className="text-sm font-medium text-red-500 animate-fadeIn">{errors.username}</p>}
                                </div>
                            </div>

                            {/* Secao de Seguranca Destacada */}
                            <div className={`p-6 md:p-8 rounded-2xl border transition-all ${darkMode ? 'bg-gray-800/80 border-gray-700/80 hover:border-indigo-500/50' : 'bg-gray-50/80 border-gray-200 hover:border-indigo-300'} mt-8 relative overflow-hidden group`}>
                                <div className={`absolute top-0 left-0 w-1.5 h-full ${darkMode ? 'bg-indigo-500/80 group-hover:bg-indigo-400' : 'bg-indigo-500 group-hover:bg-indigo-600'} transition-colors`}></div>

                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-xl ${darkMode ? 'bg-indigo-900/40 text-indigo-400' : 'bg-white shadow-sm border border-indigo-100 text-indigo-600'}`}>
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                        </div>
                                        <div>
                                            <h4 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Segurança da Conta</h4>
                                            <p className={`text-sm mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Gerencie sua senha de acesso</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" checked={showPasswordFields} onChange={(e) => setShowPasswordFields(e.target.checked)} disabled={isLoading} />
                                        <div className={`w-12 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 ${darkMode ? 'peer-checked:bg-indigo-500' : 'peer-checked:bg-indigo-600'}`}></div>
                                        <span className={`ml-3 text-sm font-semibold ${darkMode ? (showPasswordFields ? 'text-indigo-400' : 'text-gray-500') : (showPasswordFields ? 'text-indigo-600' : 'text-gray-500')}`}>{showPasswordFields ? 'Visível' : 'Oculto'}</span>
                                    </label>
                                </div>

                                {showPasswordFields && (
                                    <div className={`mt-8 pt-8 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeInDown`}>
                                        <div className="space-y-2 md:col-span-2">
                                            <label className={`block text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Senha Atual</label>
                                            <input type="password" value={formData.currentPassword} onChange={(e) => handleInputChange('currentPassword', e.target.value)} disabled={isLoading}
                                                className={`${inputBase} ${errors.currentPassword ? inputError : ''}`} placeholder="Requisitada para confirmar sua identidade" />
                                            {errors.currentPassword && <p className="text-sm font-medium text-red-500 animate-fadeIn">{errors.currentPassword}</p>}
                                        </div>
                                        <div className="space-y-2">
                                            <label className={`block text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Nova Senha</label>
                                            <input type="password" value={formData.newPassword} onChange={(e) => handleInputChange('newPassword', e.target.value)} disabled={isLoading}
                                                className={`${inputBase} ${errors.newPassword ? inputError : ''}`} placeholder="Mínimo 8 caracteres" />
                                            {errors.newPassword && <p className="text-sm font-medium text-red-500 animate-fadeIn">{errors.newPassword}</p>}
                                            {formData.newPassword && <div className="mt-2"><PasswordStrengthIndicator password={formData.newPassword} darkMode={darkMode} /></div>}
                                        </div>
                                        <div className="space-y-2">
                                            <label className={`block text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Confirmar Nova Senha</label>
                                            <input type="password" value={formData.confirmPassword} onChange={(e) => handleInputChange('confirmPassword', e.target.value)} disabled={isLoading}
                                                className={`${inputBase} ${errors.confirmPassword ? inputError : ''}`} placeholder="Repita a nova senha" />
                                            {errors.confirmPassword && <p className="text-sm font-medium text-red-500 animate-fadeIn">{errors.confirmPassword}</p>}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className={`flex flex-col sm:flex-row justify-end items-center gap-4 pt-6 mt-6 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                                <button type="button" onClick={handleCancel} disabled={isLoading}
                                    className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold transition-all ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}>
                                    Cancelar
                                </button>
                                <button type="submit" disabled={isLoading}
                                    className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-bold transition-all transform hover:-translate-y-0.5 shadow-lg hover:shadow-xl ${darkMode ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:opacity-90' : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:opacity-90'}`}>
                                    {isLoading ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            Salvando...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                            Salvar Alterações
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}

// Componente de Login e Cadastro
function LoginForm({ onLogin, darkMode }) {
    const [isRegistering, setIsRegistering] = useState(false);
    const [isForgotPassword, setIsForgotPassword] = useState(false);
    const [forgotPasswordMsg, setForgotPasswordMsg] = useState({ type: '', text: '' });

    // Estados do formulário
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showFirstLoginModal, setShowFirstLoginModal] = useState(false);
    const [firstLoginUser, setFirstLoginUser] = useState(null);

    // Efeitos
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('resetAdmin') === '1' || params.get('resetAdmin') === 'sim') {
            window.history.replaceState({}, '', window.location.pathname);
            alert('A funcionalidade de reset por URL foi depreciada no novo backend.');
        }
    }, []);

    const handleFirstLoginComplete = (updatedUser) => {
        setShowFirstLoginModal(false);
        setFirstLoginUser(null);
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        onLogin(updatedUser);
    };

    const resetForm = () => {
        setError('');
        setUsername('');
        setPassword('');
        setName('');
        setEmail('');
        setConfirmPassword('');
    };

    const toggleMode = () => {
        setIsRegistering(!isRegistering);
        setIsForgotPassword(false);
        resetForm();
    };

    const toggleForgotPassword = () => {
        setIsForgotPassword(!isForgotPassword);
        setIsRegistering(false);
        resetForm();
        setForgotPasswordMsg({ type: '', text: '' });
    };

    const handleRegister = async () => {
        // Validação básica
        if (!name.trim()) { setError('Nome é obrigatório'); return; }
        if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) { setError('Email inválido'); return; }
        if (password !== confirmPassword) { setError('As senhas não coincidem'); return; }

        const userValidation = CredentialValidator.validateUsername(username);
        if (!userValidation.isValid) { setError(userValidation.errors[0]); return; }

        const passwordValidation = CredentialValidator.validatePassword(password);
        if (!passwordValidation.isValid) { setError(passwordValidation.errors[0]); return; }

        try {
            // Criar usuário no Backend
            await ApiService.register({
                name,
                email,
                username,
                password
            });

            // Não faz login automático após registro real, exibe mensagem
            setError(''); // Limpa erros
            alert('Cadastro realizado com sucesso! Sua conta aguarda aprovação do administrador para ser ativada.');
            resetForm();
            setIsRegistering(false); // Volta para tela de login
        } catch (err) {
            setError(err.message || 'Erro ao criar conta');
        }
    };

    const handleLoginSubmit = async () => {
        try {
            const user = await ApiService.login(username, password);
            setError(''); // Limpa erros em caso de sucesso

            if (user.firstLogin) {
                setFirstLoginUser(user);
                setShowFirstLoginModal(true);
                return;
            }

            localStorage.setItem('isAuthenticated', 'true');
            onLogin(user);
        } catch (error) {
            console.error('Erro no login:', error);
            setError(error.message || 'Usuário ou senha inválidos.');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            if (isRegistering) {
                await handleRegister();
            } else {
                await handleLoginSubmit();
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleForgotPasswordSubmit = async (e) => {
        e.preventDefault();
        setForgotPasswordMsg({ type: '', text: '' });
        if (!username) {
            setForgotPasswordMsg({ type: 'error', text: 'Por favor, informe seu nome de usuário.' });
            return;
        }
        setIsLoading(true);
        try {
            const res = await ApiService.forgotPassword(username);
            setForgotPasswordMsg({ type: 'success', text: res.message || 'Solicitação enviada com sucesso.' });
            setUsername('');
        } catch (err) {
            setForgotPasswordMsg({ type: 'error', text: err.message || 'Erro ao solicitar redefinição.' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
            <div className={`max-w-md w-full space-y-8 p-8 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md`}>
                <div>
                    <h2 className={`mt-6 text-center text-3xl font-extrabold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {isForgotPassword ? 'Recuperar Senha' : (isRegistering ? 'Criar Nova Conta' : 'Sistema de Consulta ISS')}
                    </h2>
                    <p className={`mt-2 text-center text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {isForgotPassword ? 'Informe seu usuário para solicitar o desbloqueio' : (isRegistering ? 'Preencha os dados abaixo para se cadastrar' : 'Faça login para acessar o sistema')}
                    </p>
                </div>

                {isForgotPassword ? (
                    <form className="mt-8 space-y-4 animate-fadeIn" onSubmit={handleForgotPasswordSubmit}>
                        <div>
                            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Nome de Usuário</label>
                            <input
                                type="text"
                                required
                                className={`appearance-none relative block w-full px-3 py-2 border ${darkMode ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300 placeholder-gray-500 text-gray-900'} rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                                placeholder="Seu nome de usuário cadastrado"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                            />
                        </div>

                        {forgotPasswordMsg.text && (
                            <div className={`text-sm text-center p-3 rounded border animate-fadeIn ${forgotPasswordMsg.type === 'success' ? (darkMode ? 'bg-green-900/40 border-green-700 text-green-300' : 'bg-green-100 border-green-200 text-green-700') : (darkMode ? 'bg-red-900/40 border-red-700 text-red-300' : 'bg-red-100 border-red-200 text-red-700')}`}>
                                {forgotPasswordMsg.text}
                            </div>
                        )}

                        <div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-50"
                            >
                                {isLoading ? 'Enviando Solicitação...' : 'Solicitar Redefinição de Senha'}
                            </button>
                        </div>

                        <div className="text-center mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <button
                                type="button"
                                onClick={toggleForgotPassword}
                                className={`text-sm font-medium hover:underline transition-colors ${darkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'}`}
                            >
                                Voltar para o Login Seguro
                            </button>
                        </div>
                    </form>
                ) : (
                    <form className="mt-8 space-y-4 animate-fadeIn" onSubmit={handleSubmit}>
                        <div className={`rounded-md shadow-sm ${isRegistering ? 'space-y-4' : '-space-y-px'}`}>
                            {isRegistering && (
                                <>
                                    <div>
                                        <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Nome Completo</label>
                                        <input
                                            type="text"
                                            required
                                            className={`appearance-none relative block w-full px-3 py-2 border ${darkMode ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300 placeholder-gray-500 text-gray-900'} rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                                            placeholder="Seu nome completo"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Email</label>
                                        <input
                                            type="email"
                                            required
                                            className={`appearance-none relative block w-full px-3 py-2 border ${darkMode ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300 placeholder-gray-500 text-gray-900'} rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                                            placeholder="seu@email.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                        />
                                    </div>
                                </>
                            )}

                            <div>
                                <label className={`${isRegistering ? 'block text-sm font-medium mb-1' : 'sr-only'} ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Usuário</label>
                                <input
                                    type="text"
                                    required
                                    className={`appearance-none relative block w-full px-3 py-2 border ${darkMode ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300 placeholder-gray-500 text-gray-900'} ${isRegistering ? 'rounded-md' : 'rounded-t-md'} focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                                    placeholder="Usuário"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className={`${isRegistering ? 'block text-sm font-medium mb-1' : 'sr-only'} ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Senha</label>
                                <input
                                    type="password"
                                    required
                                    className={`appearance-none relative block w-full px-3 py-2 border ${darkMode ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300 placeholder-gray-500 text-gray-900'} ${isRegistering ? 'rounded-md' : 'rounded-b-md'} focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                                    placeholder="Senha"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>

                            {isRegistering && (
                                <div>
                                    <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Confirmar Senha</label>
                                    <input
                                        type="password"
                                        required
                                        className={`appearance-none relative block w-full px-3 py-2 border ${darkMode ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300 placeholder-gray-500 text-gray-900'} rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                                        placeholder="Confirme sua senha"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                    />
                                </div>
                            )}
                        </div>

                        {error && (
                            <div className={`text-sm text-center p-3 rounded border animate-pulse ${error.includes('bloqueada') || error.includes('Restam') ? (darkMode ? 'bg-orange-900/40 border-orange-700 text-orange-300' : 'bg-orange-100 border-orange-200 text-orange-800') : (darkMode ? 'bg-red-900/40 border-red-700 text-red-300' : 'bg-red-100 border-red-200 text-red-800')}`}>
                                {error}
                            </div>
                        )}

                        <div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${isRegistering ? 'bg-green-600 hover:bg-green-700' : 'bg-indigo-600 hover:bg-indigo-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-50`}
                            >
                                {isLoading ? 'Processando...' : (isRegistering ? 'Cadastrar' : 'Entrar')}
                            </button>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-between text-sm mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3 sm:space-y-0">
                            {!isRegistering && (
                                <button
                                    type="button"
                                    onClick={toggleForgotPassword}
                                    className={`font-medium transition-colors hover:underline ${darkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'}`}
                                >
                                    Esqueceu sua senha?
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={toggleMode}
                                className={`font-medium transition-colors hover:underline ${isRegistering ? 'w-full text-center' : ''} ${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
                            >
                                {isRegistering ? 'Voltar para o Login' : 'Criar nova conta'}
                            </button>
                        </div>
                    </form>
                )}
            </div>

            {/* Modal de Primeiro Acesso */}
            {showFirstLoginModal && firstLoginUser && (
                <FirstLoginModal
                    user={firstLoginUser}
                    onComplete={handleFirstLoginComplete}
                    darkMode={darkMode}
                />
            )}
        </div>
    );
}
// Componente de Indicador de Força da Senha
function PasswordStrengthIndicator({ password, darkMode }) {
    const score = CredentialValidator.generatePasswordStrengthScore(password);
    const validation = CredentialValidator.validatePassword(password);

    const getStrengthText = (score) => {
        switch (score) {
            case 0:
            case 1: return 'Muito Fraca';
            case 2: return 'Fraca';
            case 3: return 'Média';
            case 4: return 'Forte';
            case 5: return 'Muito Forte';
            default: return 'Muito Fraca';
        }
    };

    const getStrengthColor = (score) => {
        switch (score) {
            case 0:
            case 1: return 'bg-red-500';
            case 2: return 'bg-orange-500';
            case 3: return 'bg-yellow-500';
            case 4: return 'bg-blue-500';
            case 5: return 'bg-green-500';
            default: return 'bg-gray-300';
        }
    };

    if (!password) return null;

    return (
        <div className="mt-2">
            <div className="flex items-center justify-between mb-1">
                <span className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    Força da senha:
                </span>
                <span className={`text-xs font-medium ${score <= 2 ? 'text-red-500' :
                    score <= 3 ? 'text-yellow-500' :
                        'text-green-500'
                    }`}>
                    {getStrengthText(score)}
                </span>
            </div>
            <div className={`w-full bg-gray-200 rounded-full h-2 ${darkMode ? 'bg-gray-700' : ''}`}>
                <div
                    className={`h-2 rounded-full transition-all duration-300 ${getStrengthColor(score)}`}
                    style={{ width: `${(score / 5) * 100}%` }}
                ></div>
            </div>
            {validation.errors.length > 0 && (
                <div className="mt-1">
                    {validation.errors.map((error, index) => (
                        <p key={index} className="text-xs text-red-500">
                            • {error}
                        </p>
                    ))}
                </div>
            )}
        </div>
    );
}

// Modal de Primeiro Acesso
function FirstLoginModal({ user, onComplete, darkMode }) {
    const [formData, setFormData] = useState({
        name: user.name || '',
        email: user.email || '',
        username: user.username,
        newPassword: '',
        confirmPassword: ''
    });
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const validateForm = () => {
        const newErrors = {};

        // Validar nome
        if (!formData.name.trim()) {
            newErrors.name = 'Nome é obrigatório';
        }

        // Validar username se foi alterado
        if (formData.username !== user.username) {
            const usernameValidation = CredentialValidator.validateUsername(formData.username);
            if (!usernameValidation.isValid) {
                newErrors.username = usernameValidation.errors[0];
            }
            // Verificação de disponibilidade será feita pelo backend
        }

        // Validar senha
        const passwordValidation = CredentialValidator.validatePassword(formData.newPassword);
        if (!passwordValidation.isValid) {
            newErrors.newPassword = passwordValidation.errors[0];
        }

        // Validar confirmação de senha
        if (formData.newPassword !== formData.confirmPassword) {
            newErrors.confirmPassword = 'As senhas não coincidem';
        }

        // Histórico de senhas validado no servidor

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        setIsSubmitting(true);

        try {
            // Atualizar usuário via API
            const profileData = {
                newPassword: formData.newPassword
            };

            const response = await ApiService.updateProfile(profileData);

            onComplete(response.user || response);
        } catch (error) {
            console.error('Erro ao atualizar senha no primeiro login:', error);
            setErrors({ submit: error.message || 'Erro interno. Tente novamente.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`max-w-md w-full mx-4 p-6 rounded-lg shadow-xl ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                }`}>
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold mb-2">🔐 Atualização de Senha</h2>
                    <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        Por segurança, é necessário cadastrar uma nova senha.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Nome */}
                    <div>
                        <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                            Nome Completo *
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            readOnly
                            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${darkMode
                                ? 'bg-gray-700 border-gray-600 text-gray-400 cursor-not-allowed'
                                : 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed'
                                }`}
                            placeholder="Seu nome completo"
                        />
                        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                    </div>

                    {/* Email */}
                    <div>
                        <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                            Email (opcional)
                        </label>
                        <input
                            type="email"
                            value={formData.email}
                            readOnly
                            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${darkMode
                                ? 'bg-gray-700 border-gray-600 text-gray-400 cursor-not-allowed'
                                : 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed'
                                }`}
                            placeholder="seu@email.com"
                        />
                    </div>

                    {/* Username */}
                    <div>
                        <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                            Nome de Usuário
                        </label>
                        <input
                            type="text"
                            value={formData.username}
                            readOnly
                            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${darkMode
                                ? 'bg-gray-700 border-gray-600 text-gray-400 cursor-not-allowed'
                                : 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed'
                                }`}
                            placeholder="Seu nome de usuário"
                        />
                        {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username}</p>}
                    </div>

                    {/* Nova Senha */}
                    <div>
                        <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                            Nova Senha *
                        </label>
                        <input
                            type="password"
                            value={formData.newPassword}
                            onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${darkMode
                                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                                : 'bg-white border-gray-300 text-gray-900'
                                } ${errors.newPassword ? 'border-red-500' : ''}`}
                            placeholder="Sua nova senha segura"
                        />
                        <PasswordStrengthIndicator password={formData.newPassword} darkMode={darkMode} />
                        {errors.newPassword && <p className="text-red-500 text-xs mt-1">{errors.newPassword}</p>}
                    </div>

                    {/* Confirmar Senha */}
                    <div>
                        <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                            Confirmar Nova Senha *
                        </label>
                        <input
                            type="password"
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${darkMode
                                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                                : 'bg-white border-gray-300 text-gray-900'
                                } ${errors.confirmPassword ? 'border-red-500' : ''}`}
                            placeholder="Confirme sua nova senha"
                        />
                        {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
                    </div>

                    {errors.submit && (
                        <div className="text-red-500 text-sm text-center">
                            {errors.submit}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                    >
                        {isSubmitting ? 'Salvando...' : 'Definir Credenciais'}
                    </button>
                </form>

                <div className={`mt-4 text-xs text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                    Esta configuração é obrigatória para sua segurança.
                </div>
            </div>
        </div>
    );
}

// Componente Modal de Cadastro de Usuário
function RegisterUserModal({ onClose, onUserCreated, darkMode }) {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        username: '',
        password: '',
        confirmPassword: '',
        role: 'user'
    });
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const validateForm = () => {
        const newErrors = {};

        if (!formData.name.trim()) newErrors.name = 'Nome é obrigatório';
        if (!formData.email.trim()) newErrors.email = 'Email é obrigatório';
        else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email inválido';

        const userValidation = CredentialValidator.validateUsername(formData.username);
        if (!userValidation.isValid) newErrors.username = userValidation.errors[0];

        const passwordValidation = CredentialValidator.validatePassword(formData.password);
        if (!passwordValidation.isValid) newErrors.password = passwordValidation.errors[0];

        if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'As senhas não coincidem';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        setIsLoading(true);
        try {
            const response = await ApiService.register({
                name: formData.name,
                email: formData.email,
                username: formData.username,
                password: formData.password,
                role: formData.role
            });

            if (onUserCreated) onUserCreated(response.user || response);
            onClose();
        } catch (error) {
            console.error('Erro ao criar usuário:', error);
            setErrors(prev => ({ ...prev, general: error.message || 'Erro ao criar usuário' }));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className={`w-full max-w-md rounded-lg shadow-xl overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-between items-center`}>
                    <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Novo Usuário</h3>
                    <button onClick={onClose} className={`text-gray-500 hover:text-gray-700 ${darkMode ? 'hover:text-gray-300' : ''}`}>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
                    {/* Campos do Formulário */}
                    <div className="space-y-4">
                        <div>
                            <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Nome Completo</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className={`mt-1 block w-full rounded-md shadow-sm px-3 py-2 border ${errors.name ? 'border-red-500' : (darkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300')}`}
                            />
                            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                        </div>

                        <div>
                            <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Email</label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className={`mt-1 block w-full rounded-md shadow-sm px-3 py-2 border ${errors.email ? 'border-red-500' : (darkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300')}`}
                            />
                            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Usuário</label>
                                <input
                                    type="text"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    className={`mt-1 block w-full rounded-md shadow-sm px-3 py-2 border ${errors.username ? 'border-red-500' : (darkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300')}`}
                                />
                                {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username}</p>}
                            </div>
                            <div>
                                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Perfil</label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    className={`mt-1 block w-full rounded-md shadow-sm px-3 py-2 border ${darkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300'}`}
                                >
                                    <option value="user">Usuário</option>
                                    <option value="consultor">Consultor</option>
                                    <option value="admin">Administrador</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Senha</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className={`mt-1 block w-full rounded-md shadow-sm px-3 py-2 border ${errors.password ? 'border-red-500' : (darkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300')}`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                                >
                                    {showPassword ? (
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                    ) : (
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a10.059 10.059 0 013.999-5.325m-2.718-2.718l14.142 14.142" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.88 9.88a3 3 0 104.24 4.24" /></svg>
                                    )}
                                </button>
                            </div>
                            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                        </div>

                        <div>
                            <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Confirmar Senha</label>
                            <input
                                type="password"
                                value={formData.confirmPassword}
                                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                className={`mt-1 block w-full rounded-md shadow-sm px-3 py-2 border ${errors.confirmPassword ? 'border-red-500' : (darkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300')}`}
                            />
                            {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
                        </div>

                        {errors.general && (
                            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                                <span className="block sm:inline">{errors.general}</span>
                            </div>
                        )}
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className={`px-4 py-2 rounded-md ${darkMode ? 'text-gray-300 hover:text-white hover:bg-gray-700' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'}`}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    Salvando...
                                </>
                            ) : (
                                'Cadastrar'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Componente de Gráfico de Barras Horizontal
function BarChart({ data, darkMode, title, color = 'blue', maxBars = 7 }) {
    const sortedData = [...data].sort((a, b) => b.value - a.value).slice(0, maxBars);

    if (sortedData.length === 0) {
        return (
            <div className={`p-4 rounded-lg shadow-sm ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <h3 className={`font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Sem dados para exibir</p>
            </div>
        );
    }

    const maxValue = Math.max(...sortedData.map(item => item.value));

    return (
        <div className={`p-4 rounded-lg shadow-sm ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
            <h3 className={`font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
            <div className="space-y-3">
                {sortedData.map((item, index) => (
                    <div key={index} className="space-y-1">
                        <div className="flex justify-between text-xs">
                            <span className={`${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{item.label}</span>
                            <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>{item.value}</span>
                        </div>
                        <div className={`w-full rounded-full h-2 overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${color === 'purple' ? 'bg-purple-500' : 'bg-blue-500'}`}
                                style={{ width: `${(item.value / maxValue) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Componente de Gráfico de Barras Vertical
function VerticalBarChart({ data, darkMode, title, color = 'blue', maxBars = 7 }) {
    const sortedData = [...data].sort((a, b) => b.value - a.value).slice(0, maxBars);

    if (sortedData.length === 0) {
        return (
            <div className={`p-4 rounded-lg shadow-sm ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <h3 className={`font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Sem dados para exibir</p>
            </div>
        );
    }

    const maxValue = Math.max(...sortedData.map(item => item.value));

    return (
        <div className={`p-4 rounded-lg shadow-sm ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
            <h3 className={`font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
            <div className="flex items-end justify-between space-x-2 h-40 pt-4">
                {sortedData.map((item, index) => (
                    <div key={index} className="flex flex-col items-center flex-1 group relative h-full justify-end">
                        <div
                            className={`w-full max-w-[40px] rounded-t-md transition-all duration-500 relative ${color === 'purple' ? 'bg-purple-500 hover:bg-purple-600' : 'bg-blue-500 hover:bg-blue-600'}`}
                            style={{ height: `${Math.max((item.value / maxValue) * 80, 5)}%` }} // Altura mínima de 5% visual
                        >
                            {/* Tooltip flutuante ao hover */}
                            <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap text-xs font-bold rounded px-2 py-1 pointer-events-none z-10 shadow-lg ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-800 text-white'}`}>
                                {item.value}
                            </div>
                        </div>
                        <span className={`text-[10px] mt-2 truncate w-full text-center ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} title={item.label}>
                            {item.label}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Componente Gráfico de Pizza
function PieChart({ data, darkMode, title }) {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#6366f1', '#f43f5e'];

    if (total === 0) {
        return (
            <div className={`p-4 rounded-lg shadow-sm ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <h3 className={`font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Sem dados para exibir</p>
            </div>
        );
    }

    let currentAngle = 0;

    return (
        <div className={`p-4 rounded-lg shadow-sm ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
            <h3 className={`font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
            <div className="flex flex-col md:flex-row items-center justify-center gap-6">
                <div className="relative w-40 h-40">
                    <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full">
                        {data.map((item, index) => {
                            const sliceAngle = (item.value / total) * 360;
                            const x1 = 50 + 50 * Math.cos(Math.PI * currentAngle / 180);
                            const y1 = 50 + 50 * Math.sin(Math.PI * currentAngle / 180);
                            const x2 = 50 + 50 * Math.cos(Math.PI * (currentAngle + sliceAngle) / 180);
                            const y2 = 50 + 50 * Math.sin(Math.PI * (currentAngle + sliceAngle) / 180);

                            const largeArcFlag = sliceAngle > 180 ? 1 : 0;
                            const pathData = `M 50 50 L ${x1} ${y1} A 50 50 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

                            const path = (
                                <path
                                    key={index}
                                    d={pathData}
                                    fill={colors[index % colors.length]}
                                    stroke={darkMode ? '#1f2937' : '#ffffff'}
                                    strokeWidth="2"
                                />
                            );

                            currentAngle += sliceAngle;
                            return path;
                        })}
                        {data.length === 1 && (
                            <circle cx="50" cy="50" r="50" fill={colors[0]} />
                        )}
                    </svg>
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                    {data.map((item, index) => (
                        <div key={index} className="flex items-center gap-2 text-xs">
                            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: colors[index % colors.length] }}></div>
                            <span className={`${darkMode ? 'text-gray-300' : 'text-gray-700'} truncate w-24`}>{item.label}</span>
                            <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                                {item.value}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// Componente da Tabela de Administradores
function AdminUsersTable({ darkMode, adminUsersListKey, onRefreshNeeded }) {
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const loadUsers = async () => {
        setIsLoading(true);
        try {
            const data = await ApiService.getUsers();
            setUsers(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Erro ao carregar lista completa de usuários:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, [adminUsersListKey]);

    const handleResetPassword = async (user) => {
        if (confirm(`Resetar senha de ${user.username} para 'Mudar@123'?`)) {
            try {
                await ApiService.resetUserPassword(user.id);
                alert(`Senha de ${user.username} resetada com sucesso.`);
                if (onRefreshNeeded) onRefreshNeeded();
            } catch (err) {
                alert('Erro ao resetar senha: ' + err.message);
            }
        }
    };

    const handleToggleBlock = async (user) => {
        try {
            await ApiService.toggleUserBlock(user.id);
            if (onRefreshNeeded) onRefreshNeeded();
            else loadUsers();
        } catch (err) {
            alert('Erro ao alterar status de bloqueio: ' + err.message);
        }
    };

    const handleDelete = async (user) => {
        if (confirm(`Excluir usuário ${user.username}? Esta ação não pode ser desfeita.`)) {
            try {
                await ApiService.deleteUser(user.id);
                if (onRefreshNeeded) onRefreshNeeded();
                else loadUsers();
            } catch (err) {
                alert('Erro ao excluir usuário: ' + err.message);
            }
        }
    };

    if (isLoading) {
        return <div className={`p-4 text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Carregando usuários...</div>;
    }

    return (
        <table className="min-w-full">
            <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-100'}>
                <tr>
                    <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Nome</th>
                    <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Usuário</th>
                    <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Perfil</th>
                    <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Status</th>
                    <th className={`px-4 py-3 text-right text-xs font-semibold uppercase ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Ações</th>
                </tr>
            </thead>
            <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                {users.map(user => {
                    // Trata boolean do SQLite ("true" / 1 ou "false" / 0)
                    const isBlocked = user.isBlockedByAdmin === true || user.isBlockedByAdmin === 1;

                    return (
                        <tr key={user.id} className={darkMode ? 'bg-gray-800' : 'bg-white'}>
                            <td className={`px-4 py-3 text-sm flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
                                    {(user.name || '?').charAt(0).toUpperCase()}
                                </div>
                                {user.name}
                            </td>
                            <td className={`px-4 py-3 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{user.username}</td>
                            <td className="px-4 py-3">
                                <span className={`text-xs px-2 py-1 rounded-full ${user.role === 'admin' ? (darkMode ? 'bg-red-900/50 text-red-400' : 'bg-red-100 text-red-700') : (darkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-100 text-gray-700')}`}>
                                    {user.role === 'admin' ? 'Administrador' : 'Usuário'}
                                </span>
                            </td>
                            <td className="px-4 py-3">
                                <span className={`text-xs px-2 py-1 flex items-center gap-1 w-max rounded-full font-medium ${isBlocked ? (darkMode ? 'bg-red-900/40 text-red-400' : 'bg-red-100 text-red-600') : (darkMode ? 'bg-green-900/40 text-green-400' : 'bg-green-100 text-green-600')}`}>
                                    {isBlocked ? 'Bloqueado' : 'Ativo'}
                                </span>
                            </td>
                            <td className="px-4 py-3 text-right text-sm">
                                {user.role !== 'admin' && (
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => handleResetPassword(user)} className={`p-1.5 rounded-lg border flex items-center justify-center ${darkMode ? 'border-gray-600 hover:bg-gray-700 text-gray-300' : 'border-gray-200 hover:bg-gray-100 text-gray-600'}`} title="Resetar senha: 'Mudar@123'">
                                            🔑
                                        </button>
                                        <button onClick={() => handleToggleBlock(user)} className={`p-1.5 rounded-lg border flex items-center justify-center ${darkMode ? 'border-gray-600 hover:bg-gray-700 text-gray-300' : 'border-gray-200 hover:bg-gray-100 text-gray-600'}`} title={isBlocked ? 'Desbloquear usuário' : 'Bloquear usuário'}>
                                            🔒
                                        </button>
                                        <button onClick={() => handleDelete(user)} className={`p-1.5 rounded-lg border flex items-center justify-center ${darkMode ? 'border-red-900 hover:bg-red-900/50 text-red-400' : 'border-red-200 hover:bg-red-100 text-red-600'}`} title="Excluir">
                                            🗑️
                                        </button>
                                    </div>
                                )}
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
}

// Componente Sidebar Completo com Menu Lateral
function Sidebar({ darkMode, currentView, setCurrentView, currentUser, onLogout, sidebarMobileOpen, onCloseSidebar }) {
    const [isExpanded, setIsExpanded] = useState(false);

    const handleNavigate = (view) => {
        setCurrentView(view);
        onCloseSidebar?.();
    };

    const menuItems = [
        {
            id: 'profile',
            label: 'Meu Perfil',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
            ),
            view: 'profile'
        }
    ];

    // Itens administrativos (apenas para admin)
    const adminItems = [
        {
            id: 'admin-dashboard',
            label: 'Dashboard',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
            ),
            view: 'admin-dashboard'
        },
        {
            id: 'admin-users',
            label: 'Usuários',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
            ),
            view: 'admin-users'
        },
        {
            id: 'admin-banners',
            label: 'Banners',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                </svg>
            ),
            view: 'admin-banners'
        }
    ];

    const isActive = (id) => {
        return currentView === id;
    };

    return (
        <div
            className={`sidebar-container flex-shrink-0 transition-all duration-300 ease-in-out ${isExpanded ? 'w-64' : 'w-20'} 
                ${darkMode ? 'bg-gray-900 border-r border-gray-800' : 'bg-white border-r border-gray-200'} 
                flex flex-col h-full shadow-lg ${sidebarMobileOpen ? 'open' : ''}`}
            onMouseEnter={() => setIsExpanded(true)}
            onMouseLeave={() => setIsExpanded(false)}
        >
            {/* Logo/Header */}
            <div className={`p-4 border-b ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0
                        ${darkMode ? 'bg-white shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'bg-white shadow-md'} 
                        overflow-hidden p-1.5 border ${darkMode ? 'border-blue-500' : 'border-gray-100'}`}>
                        <img src="image/ecossistema-digital.png" alt="DIAAF Logo" className="w-full h-full object-contain" />
                    </div>
                    {isExpanded && (
                        <div className="overflow-hidden animate-fadeInLeft">
                            <h1 className={`font-bold text-lg leading-tight ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                Ecossistema DIAAF
                            </h1>
                            <p className={`text-[10px] uppercase tracking-tighter font-semibold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                                Auditoria e Assuntos Fiscais
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Menu de Navegação */}
            <nav className="flex-1 py-4 overflow-y-auto custom-scrollbar">
                <div className="px-3 space-y-1">
                    {/* Separador Principal */}
                    {isExpanded && (
                        <p className={`px-3 text-xs font-semibold uppercase tracking-wider mb-2 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                            Menu Principal
                        </p>
                    )}

                    {/* Itens do Menu Principal */}
                    {menuItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => handleNavigate(item.view)}
                            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group
                                ${isActive(item.id)
                                    ? `${darkMode ? 'bg-blue-600/20 text-blue-400' : 'bg-blue-50 text-blue-600'} shadow-sm`
                                    : `${darkMode ? 'text-gray-400 hover:bg-gray-800 hover:text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`
                                }`}
                            title={!isExpanded ? item.label : ''}
                        >
                            <div className={`flex-shrink-0 ${isActive(item.id) ? 'scale-110' : 'group-hover:scale-110'} transition-transform`}>
                                {item.icon}
                            </div>
                            {isExpanded && (
                                <span className="font-medium truncate animate-fadeInLeft">{item.label}</span>
                            )}
                            {isActive(item.id) && isExpanded && (
                                <div className={`ml-auto w-2 h-2 rounded-full ${darkMode ? 'bg-blue-400' : 'bg-blue-600'} animate-pulse`}></div>
                            )}
                        </button>
                    ))}

                    {/* Seção Administrativa (apenas para admin) */}
                    {currentUser?.role === 'admin' && (
                        <>
                            {isExpanded && (
                                <p className={`px-3 text-xs font-semibold uppercase tracking-wider mt-6 mb-2 ${darkMode ? 'text-red-400' : 'text-red-500'}`}>
                                    Administração
                                </p>
                            )}

                            {/* Separador visual */}
                            <div className={`my-2 border-t ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}></div>

                            {adminItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => handleNavigate(item.view)}
                                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group
                                        ${isActive(item.id)
                                            ? `${darkMode ? 'bg-red-600/20 text-red-400' : 'bg-red-50 text-red-600'} shadow-sm`
                                            : `${darkMode ? 'text-gray-400 hover:bg-gray-800 hover:text-red-400' : 'text-gray-600 hover:bg-red-50 hover:text-red-600'}`
                                        }`}
                                    title={!isExpanded ? item.label : ''}
                                >
                                    <div className={`flex-shrink-0 ${isActive(item.id) ? 'scale-110' : 'group-hover:scale-110'} transition-transform`}>
                                        {item.icon}
                                    </div>
                                    {isExpanded && (
                                        <span className="font-medium truncate animate-fadeInLeft">{item.label}</span>
                                    )}
                                    {isActive(item.id) && isExpanded && (
                                        <div className={`ml-auto w-2 h-2 rounded-full ${darkMode ? 'bg-red-400' : 'bg-red-600'} animate-pulse`}></div>
                                    )}
                                </button>
                            ))}
                        </>
                    )}
                </div>
            </nav>

            {/* Informações do Usuário no Rodapé */}
            <div className={`p-4 border-t ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                <div className={`flex items-center gap-3 p-2 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                        ${currentUser?.role === 'admin' ? 'bg-red-500' : 'bg-blue-500'} text-white font-bold shadow-md`}>
                        {currentUser?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    {isExpanded && (
                        <div className="overflow-hidden flex-1 min-w-0">
                            <p className={`font-semibold text-sm truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                {currentUser?.name || 'Usuário'}
                            </p>
                            <p className={`text-xs truncate ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                {currentUser?.role === 'admin' ? 'Administrador' : 'Usuário'}
                            </p>
                        </div>
                    )}
                    {isExpanded && (
                        <button
                            onClick={onLogout}
                            className={`p-2 rounded-lg transition-all duration-200 ${darkMode ? 'hover:bg-gray-700 text-gray-400 hover:text-red-400' : 'hover:bg-gray-200 text-gray-500 hover:text-red-500'}`}
                            title="Sair"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// ==================== PAINEL DE CONTROLE DE BANNERS ====================
// Config estática dos banners (UI, cores, links)
const BANNER_STATIC = {
    'iss-cnae': {
        label: 'Consulta ISS / CNAE',
        description: 'Pesquise alíquotas e códigos de serviço rapidamente',
        icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
        light: 'from-blue-50 to-purple-50 border-blue-200 hover:border-blue-400',
        dark: 'from-blue-900/50 to-purple-900/50 border-blue-500/30 hover:border-blue-500',
        iconLight: 'bg-white text-blue-600 shadow-md',
        iconDark: 'bg-blue-500/20 text-blue-400',
        hoverBg: { light: 'bg-blue-600', dark: 'bg-white' },
        isInternal: true
    },
    'pareceres': {
        label: 'Gerador de Pareceres',
        description: 'Gere pareceres fiscais automaticamente',
        icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
        href: 'https://script.google.com/macros/s/AKfycbzL4QGjBggc_7QeV-RPrE25n6bYDkgUOQ36v1dmjyMJN_34YgYYsTuyg-SVe3tBA903Lg/exec',
        light: 'from-emerald-50 to-teal-50 border-emerald-200 hover:border-emerald-400',
        dark: 'from-emerald-900/50 to-teal-900/50 border-emerald-500/30 hover:border-emerald-500',
        iconLight: 'bg-white text-emerald-600 shadow-md',
        iconDark: 'bg-emerald-500/20 text-emerald-400',
        hoverBg: { light: 'bg-emerald-600', dark: 'bg-white' }
    },
    'incidencia': {
        label: 'Incidência do ISS',
        description: 'LC 116/2003 – Art. 3º',
        icon: 'M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3',
        href: 'https://script.google.com/macros/s/AKfycbwFWD5zweoKS-WccLZJkH4KCVQSKcLR-guuITNhmOYg/dev',
        light: 'from-orange-50 to-amber-50 border-orange-200 hover:border-orange-400',
        dark: 'from-orange-900/50 to-amber-900/50 border-orange-500/30 hover:border-orange-500',
        iconLight: 'bg-white text-orange-600 shadow-md',
        iconDark: 'bg-orange-500/20 text-orange-400',
        hoverBg: { light: 'bg-orange-600', dark: 'bg-white' }
    },
    'processos': {
        label: 'Análise de Processos',
        description: 'Visualize e analise processos fiscais',
        icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
        href: 'https://reportterra-diaaf.up.railway.app/login',
        light: 'from-violet-50 to-indigo-50 border-violet-200 hover:border-violet-400',
        dark: 'from-violet-900/50 to-indigo-900/50 border-violet-500/30 hover:border-violet-500',
        iconLight: 'bg-white text-violet-600 shadow-md',
        iconDark: 'bg-violet-500/20 text-violet-400',
        hoverBg: { light: 'bg-violet-600', dark: 'bg-white' }
    },
    'nfse-nacional': {
        label: 'NFS-e Nacional',
        description: 'Emissor Nacional de Nota Fiscal de Serviço',
        imageIcon: 'image/nfs-e.png',
        imageClass: 'w-full h-full object-cover rounded-full',
        href: 'https://www.gov.br/nfse/pt-br/mei-e-demais-empresas/acesso-aos-sistemas',
        light: 'from-cyan-50 to-sky-50 border-cyan-200 hover:border-cyan-400',
        dark: 'from-cyan-900/50 to-sky-900/50 border-cyan-500/30 hover:border-cyan-500',
        iconLight: 'bg-white text-cyan-600 shadow-md',
        iconDark: 'bg-cyan-500/20 text-cyan-400',
        hoverBg: { light: 'bg-cyan-600', dark: 'bg-white' }
    },
    'diario-oficial': {
        label: 'Diário Oficial',
        description: 'Publicações do Diário Oficial de Imperatriz',
        imageIcon: 'image/brasao.png',
        imageClass: 'w-full h-full object-cover rounded-full',
        href: 'https://diariooficial.imperatriz.ma.gov.br/publicacoes',
        light: 'from-slate-50 to-gray-50 border-slate-200 hover:border-slate-400',
        dark: 'from-slate-900/50 to-gray-900/50 border-slate-500/30 hover:border-slate-500',
        iconLight: 'bg-white text-slate-600 shadow-md',
        iconDark: 'bg-slate-500/20 text-slate-400',
        hoverBg: { light: 'bg-slate-600', dark: 'bg-white' }
    },
    'dte': {
        label: 'Prefeitura Moderna',
        description: 'O seu portal centralizado para serviços e tributos municipais',
        imageIcon: 'image/bauhaus.png',
        imageClass: 'w-full h-full object-cover rounded-full',
        href: 'https://imperatriz-ma.prefeituramoderna.com.br/dte/index.php?',
        light: 'from-rose-50 to-pink-50 border-rose-200 hover:border-rose-400',
        dark: 'from-rose-900/50 to-pink-900/50 border-rose-500/30 hover:border-rose-500',
        iconLight: 'bg-white text-rose-600 shadow-md',
        iconDark: 'bg-rose-500/20 text-rose-400',
        hoverBg: { light: 'bg-rose-600', dark: 'bg-white' }
    },
    'arrecadacao': {
        label: 'Transparência',
        description: 'Acompanhe as contas públicas do município',
        imageIcon: 'image/brasao.png',
        imageClass: 'w-full h-full object-cover rounded-full',
        href: 'http://scpi3.adtrcloud.com.br:8079/transparencia/',
        light: 'from-fuchsia-50 to-pink-50 border-fuchsia-200 hover:border-fuchsia-400',
        dark: 'from-fuchsia-900/50 to-pink-900/50 border-fuchsia-500/30 hover:border-fuchsia-500',
        iconLight: 'bg-white text-fuchsia-600 shadow-md',
        iconDark: 'bg-fuchsia-500/20 text-fuchsia-400',
        hoverBg: { light: 'bg-fuchsia-600', dark: 'bg-white' }
    },
    'receita': {
        label: 'Arrecadação',
        description: 'Painel gerencial de indicadores tributários',
        icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
        href: 'https://lookerstudio.google.com/u/0/reporting/c62bd011-53f8-4195-8770-cd7e617aa0ac/page/RT8lD',
        light: 'from-green-50 to-lime-50 border-green-200 hover:border-green-400',
        dark: 'from-green-900/50 to-lime-900/50 border-green-500/30 hover:border-green-500',
        iconLight: 'bg-white text-green-600 shadow-md',
        iconDark: 'bg-green-500/20 text-green-400',
        hoverBg: { light: 'bg-green-600', dark: 'bg-white' }
    }
};

function AdminBannersPanel({ darkMode }) {
    const [banners, setBanners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState(null);
    const [toast, setToast] = useState(null);
    const [isReordering, setIsReordering] = useState(false);

    // Refs for Drag and Drop
    const dragItem = useRef();
    const dragOverItem = useRef();

    useEffect(() => {
        loadBanners();
    }, []);

    const loadBanners = async () => {
        setLoading(true);
        try {
            const data = await ApiService.getBanners();
            setBanners(data);
        } catch (e) {
            setToast({ type: 'error', msg: 'Erro ao carregar banners.' });
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = async (banner) => {
        setSavingId(banner.id);
        const newEnabled = !banner.enabled;
        try {
            await ApiService.toggleBanner(banner.id, newEnabled);
            setBanners(prev => prev.map(b => b.id === banner.id ? { ...b, enabled: newEnabled } : b));
            setToast({ type: 'success', msg: `Banner "${banner.label}" ${newEnabled ? 'ativado' : 'desativado'} com sucesso.` });
        } catch (e) {
            setToast({ type: 'error', msg: 'Erro ao atualizar banner.' });
        } finally {
            setSavingId(null);
            setTimeout(() => setToast(null), 3000);
        }
    };

    const handleSort = async () => {
        if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
            setIsReordering(true);
            const _banners = [...banners];
            // Remove the dragged item
            const draggedItemContent = _banners.splice(dragItem.current, 1)[0];
            // Insert it at the new position
            _banners.splice(dragOverItem.current, 0, draggedItemContent);

            // Re-assign orderIndex locally to ensure the new order is correct payload
            const orderedPayload = _banners.map((b, index) => ({ id: b.id, orderIndex: index }));

            setBanners(_banners);

            try {
                await ApiService.reorderBanners(orderedPayload);
                setToast({ type: 'success', msg: 'Ordem dos banners atualizada!' });
            } catch (e) {
                setToast({ type: 'error', msg: 'Erro ao salvar a nova ordem.' });
                loadBanners(); // Reload original order on fail
            } finally {
                setIsReordering(false);
                setTimeout(() => setToast(null), 3000);
            }
        }

        // Reset refs
        dragItem.current = null;
        dragOverItem.current = null;
    };

    return (
        <div className="animate-fadeInUp">
            {/* Header Clean */}
            <div className={`mb-6 p-5 rounded-2xl ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-100 shadow-sm'}`}>
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Gerenciador de Banners</h2>
                        <p className={`text-sm mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Controle dinamicamente quais recursos aparecem na tela inicial.</p>
                    </div>
                </div>
            </div>

            {/* Toast */}
            {toast && (
                <div className={`mb-6 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 animate-fadeInDown ${toast.type === 'success'
                    ? (darkMode ? 'bg-green-900/40 text-green-300 border border-green-700' : 'bg-green-50 text-green-800 border border-green-200')
                    : (darkMode ? 'bg-red-900/40 text-red-300 border border-red-700' : 'bg-red-50 text-red-800 border border-red-200')
                    }`}>
                    {toast.type === 'success' ? '✅' : '❌'} {toast.msg}
                </div>
            )}

            {loading ? (
                <div className="flex justify-center items-center py-16">
                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-200 border-t-blue-600"></div>
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {banners.map((banner, index) => {
                        const s = BANNER_STATIC[banner.key];
                        if (!s) return null;
                        const isSaving = savingId === banner.id;

                        return (
                            <div
                                key={banner.id}
                                draggable
                                onDragStart={(e) => { dragItem.current = index; e.currentTarget.classList.add('opacity-50', 'scale-95'); }}
                                onDragEnter={(e) => dragOverItem.current = index}
                                onDragEnd={(e) => { e.currentTarget.classList.remove('opacity-50', 'scale-95'); handleSort(); }}
                                onDragOver={(e) => e.preventDefault()}
                                className={`flex items-center p-4 rounded-xl transition-all duration-200 border cursor-move ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100 shadow-sm hover:shadow-md'} ${!banner.enabled ? 'opacity-70 grayscale-[20%]' : ''}`}
                            >
                                <div className={`flex items-center justify-center px-2 mr-2 text-gray-400 cursor-grab active:cursor-grabbing`}>
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" /></svg>
                                </div>
                                <div className={`w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center mr-4 ${darkMode ? s.iconDark : s.iconLight} overflow-hidden shadow-inner pointer-events-none`}>
                                    {s.imageIcon ? (
                                        <img src={s.imageIcon} alt="" className={s.imageClass || "w-full h-full object-contain p-1.5"} />
                                    ) : (
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={s.icon || 'M4 5h16'} />
                                        </svg>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0 pr-4">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <h3 className={`font-semibold text-base truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>{s.label || banner.label}</h3>
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${banner.enabled ? (darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700') : (darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500')}`}>
                                            {banner.enabled ? 'On' : 'Off'}
                                        </span>
                                    </div>
                                    {s.description && <p className={`text-xs truncate ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{s.description}</p>}
                                </div>

                                <button
                                    onClick={() => handleToggle(banner)}
                                    disabled={isSaving}
                                    title={banner.enabled ? "Desativar banner" : "Ativar banner"}
                                    className={`relative flex-shrink-0 inline-flex h-7 w-12 items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${darkMode ? 'focus:ring-offset-gray-900' : ''} ${banner.enabled ? 'bg-blue-600' : (darkMode ? 'bg-gray-600' : 'bg-gray-200')} ${isSaving ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
                                >
                                    <span
                                        className={`inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out flex items-center justify-center ${banner.enabled ? 'translate-x-5' : 'translate-x-0'}`}
                                    >
                                        {isSaving && <div className="w-3 h-3 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>}
                                    </span>
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
// ========================================================================

function App() {
    // Estados de autenticação
    const [isAuthenticated, setIsAuthenticated] = useState(() => {
        return localStorage.getItem('isAuthenticated') === 'true';
    });
    const [currentUser, setCurrentUser] = useState(() => {
        const savedUser = localStorage.getItem('currentUser');
        return savedUser ? JSON.parse(savedUser) : null;
    });

    // Estado de navegação - Views: 'home' | 'search' | 'profile' | 'admin-dashboard' | 'admin-users'
    const [currentView, setCurrentView] = useState('home');
    // Sidebar mobile: abre/fecha no celular
    const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);

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

    // Estado para usuários pendentes (apenas admin)
    const [pendingUsers, setPendingUsers] = useState([]);
    // Força re-render da lista de usuários na view admin após bloqueio/delete/reset
    const [adminUsersListKey, setAdminUsersListKey] = useState(0);

    const handleSortBanners = async () => {
        if (!currentUser || currentUser.role !== 'admin') return;

        if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
            setIsReorderingBanners(true);
            const _banners = [...bannerConfig];

            // Adjust dragged array locally
            const draggedItemContent = _banners.splice(dragItem.current, 1)[0];
            _banners.splice(dragOverItem.current, 0, draggedItemContent);

            const orderedPayload = _banners.map((b, index) => ({ id: b.id, orderIndex: index }));

            setBannerConfig(_banners);

            try {
                await ApiService.reorderBanners(orderedPayload);
            } catch (e) {
                console.error("Falha ao salvar a reordenação.", e);
            } finally {
                setIsReorderingBanners(false);
            }
        }

        // Reset refs
        dragItem.current = null;
        dragOverItem.current = null;
    };

    // Estado de configuração de banners
    const [bannerConfig, setBannerConfig] = useState([]);

    // Drag and Drop Banners refs
    const dragItem = useRef();
    const dragOverItem = useRef();
    const [isReorderingBanners, setIsReorderingBanners] = useState(false);
    const [isDraggingBanners, setIsDraggingBanners] = useState(false); // New state for global CSS

    // Carregar/recarregar config de banners ao montar e sempre que voltar para Home
    useEffect(() => {
        const loadBanners = () => {
            ApiService.getBanners()
                .then(data => setBannerConfig(data))
                .catch(() => {
                    setBannerConfig([
                        { id: 'banner-iss-cnae', key: 'iss-cnae', label: 'Consulta ISS / CNAE', enabled: true },
                        { id: 'banner-pareceres', key: 'pareceres', label: 'Gerador de Pareceres', enabled: true },
                        { id: 'banner-incidencia', key: 'incidencia', label: 'Incidência do ISS', enabled: true },
                        { id: 'banner-processos', key: 'processos', label: 'Análise de Processos', enabled: true },
                    ]);
                });
        };
        loadBanners();
    }, [currentView]);

    useEffect(() => {
        if (currentUser?.role === 'admin') {
            loadPendingUsers();
        }
    }, [currentUser]);

    const loadPendingUsers = async () => {
        try {
            const users = await ApiService.getUsers();
            // SQLite boolean returns 1 or 0 for isAuthorized, or false/true
            const pending = users.filter(u => u.isAuthorized === false || u.isAuthorized === 0);
            setPendingUsers(pending);
        } catch (error) {
            console.error("Erro ao carregar usuários pendentes:", error);
        }
    };

    const handleAuthorizeUser = async (userId) => {
        if (confirm('Deseja autorizar este usuário?')) {
            try {
                await ApiService.authorizeUser(userId);
                loadPendingUsers();
                setAdminUsersListKey(k => k + 1); // Recarrega a tabela de admin também
            } catch (error) {
                alert('Erro ao autorizar usuário: ' + error.message);
            }
        }
    };

    // Estados para estatísticas de uso
    const [statistics, setStatistics] = useState(() => {
        const saved = localStorage.getItem('appStatistics');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Validar estrutura esperada
                if (typeof parsed === 'object' && parsed !== null) {
                    // Garantir que userSessions seja objeto
                    if (Array.isArray(parsed.userSessions)) {
                        parsed.userSessions = {};
                    }
                    // Garantir que searchHistory seja array válido
                    if (!Array.isArray(parsed.searchHistory)) {
                        parsed.searchHistory = [];
                    }
                    return parsed;
                }
            } catch (e) {
                console.error('Erro ao carregar estatísticas, resetando:', e);
                localStorage.removeItem('appStatistics');
            }
        }
        return {
            totalAccesses: 0,
            totalSearches: 0,
            universalSearches: 0,
            advancedSearches: 0,
            lastAccess: null,
            dailyAccesses: {},
            searchHistory: [],
            userSessions: {}
        };
    });

    // Funções para estatísticas
    const updateStatistics = (type, data = {}) => {
        const now = new Date();
        const today = now.toDateString();

        setStatistics(prev => {
            const newStats = { ...prev };

            switch (type) {
                case 'access':
                    newStats.totalAccesses += 1;
                    newStats.lastAccess = now.toISOString();

                    // Atualizar acessos diários (Objeto: chave=data, valor=count)
                    newStats.dailyAccesses[today] = (newStats.dailyAccesses[today] || 0) + 1;

                    // Manter histórico de acessos diários limpo (opcional: remover chaves antigas se necessário)
                    // Para simplificar e evitar complexidade excessiva, mantemos o objeto crescendo por enquanto
                    // ou poderíamos converter para entries, ordenar e reconstruir se ficar muito grande.

                    // Registrar sessão do usuário (Objeto: chave=user, valor=count)
                    if (data.username) {
                        newStats.userSessions[data.username] = (newStats.userSessions[data.username] || 0) + 1;
                    }


                    // Manter histórico de acessos diários limpo (opcional: remover chaves antigas se necessário)
                    // Para simplificar e evitar complexidade excessiva, mantemos o objeto crescendo por enquanto
                    // ou poderíamos converter para entries, ordenar e reconstruir se ficar muito grande.
                    break;

                case 'search':
                    newStats.totalSearches += 1;
                    if (data.searchMode === 'universal') {
                        newStats.universalSearches += 1;
                    } else if (data.searchMode === 'advanced') {
                        newStats.advancedSearches += 1;
                    }

                    // Adicionar ao histórico de pesquisas
                    newStats.searchHistory.push({
                        timestamp: now.toISOString(),
                        mode: data.searchMode,
                        user: data.user,
                        query: data.query,
                        results: data.results || 0
                    });

                    // Manter apenas últimas 200 pesquisas
                    newStats.searchHistory = newStats.searchHistory.slice(-200);
                    break;
            }

            // Salvar no localStorage
            localStorage.setItem('appStatistics', JSON.stringify(newStats));
            return newStats;
        });
    };

    // Funções de autenticação
    const handleLogin = (user) => {
        setIsAuthenticated(true);
        setCurrentUser(user);
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('currentUser', JSON.stringify(user));

        // Registrar acesso nas estatísticas
        updateStatistics('access', {
            username: user.username,
            role: user.role
        });
    };

    const handleLogout = () => {
        setIsAuthenticated(false);
        setCurrentUser(null);
        setCurrentView('home');
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('currentUser');
    };

    const handleCredentialsChanged = (updatedUser) => {
        setCurrentUser(updatedUser);
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));

        // Registrar alteração de credenciais nas estatísticas
        updateStatistics('credentialChange', {
            username: updatedUser.username,
            role: updatedUser.role
        });
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
        console.log('Carregando dados Markdown...');
        fetch('dados.md')
            .then(response => {
                console.log('Resposta recebida:', response.status);
                return response.text();
            })
            .then(mdText => {
                console.log('Markdown carregado, tamanho:', mdText.length);

                // Parse do Markdown
                const lines = mdText.split('\n');
                const dataRows = lines.filter(line => line.trim().startsWith('|'));

                // Remover cabeçalho e separador (primeiras 2 linhas da tabela)
                // Assumindo que o arquivo começa com título e depois a tabela
                // Vamos encontrar onde começa a tabela
                const startIndex = dataRows.findIndex(row => row.includes('LIST LC'));

                // Pegar apenas as linhas de dados (pular header e separador)
                const contentRows = dataRows.slice(startIndex + 2);

                console.log('Número de linhas de dados encontradas:', contentRows.length);

                const parsedData = contentRows.map(row => {
                    // Dividir por pipe e limpar espaços
                    // Ex: | 01.01 | Desc | ... |
                    // split('|') gera ['', '01.01', 'Desc', ..., '']
                    const cols = row.split('|').map(col => col.trim());

                    // Colunas esperadas:
                    // 1: LIST LC
                    // 2: Descrição LC
                    // 3: CNAE
                    // 4: Descrição CNAE
                    // 5: Alíquota

                    return {
                        "LIST LC": cols[1] || '',
                        "Descrição item da lista da Lei Complementar nº 001/2003 - CTM": cols[2] || '',
                        "CNAE": cols[3] || '',
                        "Descrição do CNAE": cols[4] || '',
                        "Alíquota": cols[5] || ''
                    };
                }).filter(item => item["LIST LC"] && item["LIST LC"] !== '---'); // Filtrar linhas inválidas/separadores

                console.log('Dados processados:', parsedData.length, 'itens');
                if (parsedData.length > 0) {
                    console.log('Primeiro item:', parsedData[0]);
                }

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



    const handleSearch = () => {
        setIsLoading(true);

        // Preparar dados da consulta para estatísticas
        const queryData = {
            searchTerm: searchTerm.trim(),
            itemCode: itemCode.trim(),
            serviceDescription: serviceDescription.trim(),
            cnaeCode: cnaeCode.trim(),
            cnaeDescription: cnaeDescription.trim()
        };

        const queryString = Object.values(queryData).filter(v => v).join(' | ');

        setTimeout(() => {
            const results = filterData();
            setModalResults(results);
            setNoResults(results.length === 0);
            setIsModalOpen(true);
            setIsLoading(false);

            // Registrar pesquisa nas estatísticas
            updateStatistics('search', {
                searchMode: searchMode,
                user: currentUser?.username || 'unknown',
                query: queryString || 'consulta vazia',
                results: results.length
            });
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
        <div className="flex h-screen overflow-hidden">
            {/* Hack CSS Global Dinâmico para Cursor Grabbing - Exibido Apenas Durante o Arraste dos Banners */}
            {isDraggingBanners && (
                <style dangerouslySetInnerHTML={{
                    __html: `
                    * {
                        cursor: grabbing !important;
                        user-select: none !important;
                    }
                `}} />
            )}
            <Sidebar
                darkMode={darkMode}
                currentView={currentView}
                setCurrentView={setCurrentView}
                currentUser={currentUser}
                onLogout={handleLogout}
                sidebarMobileOpen={sidebarMobileOpen}
                onCloseSidebar={() => setSidebarMobileOpen(false)}
            />
            {/* Overlay do menu lateral no mobile */}
            {sidebarMobileOpen && (
                <div
                    className="sidebar-overlay active md:hidden"
                    onClick={() => setSidebarMobileOpen(false)}
                    aria-hidden="true"
                />
            )}
            <div className="flex-1 overflow-y-auto">
                <div className={`min-h-screen transition-all duration-500 ${darkMode ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50'}`}>
                    <div className="container mx-auto px-4 py-8 max-w-6xl">
                        <header className="mb-8">
                            {/* Top Bar: Menu hamburger + Dark Mode + Ícone */}
                            <div className="flex justify-between items-center bg-white/30 backdrop-blur-md rounded-3xl p-4 shadow-sm border border-white/20 dark:border-gray-700/30 dark:bg-gray-800/30 transition-colors">
                                <div className="flex items-center gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setSidebarMobileOpen(true)}
                                        className={`sidebar-toggle-mobile md:hidden flex items-center justify-center p-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-800 text-white border border-gray-700' : 'bg-white text-gray-700 border border-gray-200'}`}
                                        aria-label="Abrir menu"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                        </svg>
                                    </button>

                                    {/* Botão Voltar (fora da Home) ou Saudação (na Home) */}
                                    {currentView !== 'home' ? (
                                        <button
                                            onClick={() => setCurrentView('home')}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all duration-200 hover:-translate-x-0.5 ${darkMode
                                                ? 'bg-gray-700/60 text-gray-200 hover:bg-gray-700 border border-gray-600'
                                                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                                                } shadow-sm`}
                                        >
                                            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                            </svg>
                                            <span className="hidden sm:inline">Início</span>
                                        </button>
                                    ) : (
                                        currentUser && (
                                            <div className="hidden sm:block ml-1">
                                                <h2 className={`font-semibold text-lg tracking-tight ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                                                    Olá, {currentUser.name?.split(' ')[0] || currentUser.username} 👋
                                                </h2>
                                                <p className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                    Bem-vindo ao portal
                                                </p>
                                            </div>
                                        )
                                    )}
                                </div>

                                <div className="flex items-center gap-3">
                                    {/* Botão de Dark Mode integrado */}
                                    <button
                                        onClick={() => setDarkMode(!darkMode)}
                                        className={`p-2.5 rounded-full transition-all duration-300 ${darkMode ? 'bg-gray-700/80 text-yellow-400 hover:bg-gray-600' : 'bg-white text-gray-600 hover:bg-gray-100'} shadow-sm flex items-center justify-center border ${darkMode ? 'border-gray-600' : 'border-gray-100'}`}
                                        title={darkMode ? 'Modo Claro' : 'Modo Escuro'}
                                    >
                                        {darkMode ? (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                            </svg>
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                            </svg>
                                        )}
                                    </button>

                                    <div className="relative ml-2">
                                        <div className={`w-11 h-11 rounded-full flex items-center justify-center shadow-md transform transition-transform hover:scale-105 ${darkMode ? 'bg-gradient-to-tr from-blue-600 to-purple-600' : 'bg-gradient-to-tr from-blue-500 to-purple-600'}`}>
                                            <span className="text-white font-bold text-sm tracking-widest">
                                                {currentUser?.name?.substring(0, 2).toUpperCase() || currentUser?.username.substring(0, 2).toUpperCase() || 'AD'}
                                            </span>
                                        </div>
                                        <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800 ${darkMode ? 'bg-green-500' : 'bg-green-400'}`}>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Cabeçalho de Consulta Exclusivo da página Buscar */}
                            {currentView === 'search' && (
                                <div className="text-center animate-fadeInDown mt-10 mb-2">
                                    <h1 className={`text-4xl md:text-5xl font-extrabold mb-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent`}>
                                        Consulta Lista/Cnae/Alíquota
                                    </h1>
                                    <p className={`text-lg md:text-xl mb-6 font-light ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                        Consulte itens da Lista de Serviços e suas respectivas alíquotas do ISS
                                    </p>
                                    <div className={`inline-flex items-center px-5 py-2.5 rounded-full text-sm font-medium shadow-sm transition-colors ${darkMode ? 'bg-gray-800/80 text-blue-300 border border-gray-700' : 'bg-white/80 text-blue-700 border border-blue-100'} backdrop-blur-sm`}>
                                        <div className="status-indicator status-active mr-2"></div>
                                        Sistema Online • {data.length} itens
                                        {currentUser?.role === 'admin' && (
                                            <span className="ml-3 px-2 py-0.5 bg-red-500/90 text-white text-[10px] uppercase font-bold tracking-wider rounded-md">
                                                Admin
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </header>

                        {/* Navegação condicional entre views */}
                        {currentView === 'profile' && (
                            <UserProfilePage
                                user={currentUser}
                                onLogout={handleLogout}
                                onCredentialsChanged={handleCredentialsChanged}
                                darkMode={darkMode}
                            />
                        )}

                        {currentView === 'home' && (
                            <div className="animate-fadeInUp space-y-8">
                                <div className={`grid gap-6 mt-2 ${bannerConfig.filter(b => currentUser?.role === 'admin' || b.enabled).length === 1 ? 'grid-cols-1 max-w-xs mx-auto' :
                                    bannerConfig.filter(b => currentUser?.role === 'admin' || b.enabled).length === 2 ? 'grid-cols-1 md:grid-cols-2' :
                                        bannerConfig.filter(b => currentUser?.role === 'admin' || b.enabled).length === 3 ? 'grid-cols-1 md:grid-cols-3' :
                                            'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
                                    }`}>
                                    {bannerConfig
                                        .filter(b => currentUser?.role === 'admin' || b.enabled)
                                        .map((banner, index) => {
                                            const s = BANNER_STATIC[banner.key];
                                            if (!s) return null;
                                            const isAdmin = currentUser?.role === 'admin';
                                            const isDisabledForUser = !banner.enabled && !isAdmin;

                                            const cardClass = `flex flex-col items-center justify-center p-8 rounded-2xl border-2 transition-all transform hover:-translate-y-2 hover:shadow-2xl ${darkMode
                                                ? `bg-gradient-to-br ${s.dark}`
                                                : `bg-gradient-to-br ${s.light}`
                                                } group relative overflow-hidden ${isDisabledForUser ? 'opacity-40 cursor-default hover:translate-y-0 hover:shadow-none' : ''
                                                } ${isAdmin ? 'cursor-pointer active:cursor-grabbing' : ''}`;

                                            const content = (
                                                <>
                                                    <div className={`absolute inset-0 opacity-0 ${'group-hover:opacity-10'} transition-opacity duration-300 ${darkMode ? s.hoverBg?.dark || 'bg-white' : s.hoverBg?.light || 'bg-blue-600'}`}></div>
                                                    {!banner.enabled && isAdmin && (
                                                        <div className="absolute top-2 right-2 text-xs font-bold px-2 py-0.5 rounded-full bg-gray-500/80 text-white">
                                                            Inativo
                                                        </div>
                                                    )}
                                                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${darkMode ? s.iconDark : s.iconLight} overflow-hidden pointer-events-none`}>
                                                        {s.imageIcon ? (
                                                            <img src={s.imageIcon} alt="" className={s.imageClass || "w-full h-full object-contain p-1.5"} />
                                                        ) : (
                                                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={s.icon} />
                                                            </svg>
                                                        )}
                                                    </div>
                                                    <h3 className={`text-xl font-bold mb-2 text-center pointer-events-none ${darkMode ? 'text-white' : 'text-gray-900'}`}>{s.label || banner.label}</h3>
                                                    <p className={`text-sm text-center leading-relaxed pointer-events-none ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{s.description}</p>
                                                    {isAdmin && (
                                                        <div className="absolute bottom-3 right-3 text-gray-400 opacity-0 group-hover:opacity-[0.8] transition-opacity cursor-grab active:cursor-grabbing pb-1 pr-1 pointer-events-none">
                                                            <svg className="w-6 h-6 drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" /></svg>
                                                        </div>
                                                    )}
                                                </>
                                            );

                                            const dragProps = isAdmin ? {
                                                draggable: true,
                                                onDragStart: (e) => {
                                                    dragItem.current = index;
                                                    e.currentTarget.classList.add('opacity-50', 'scale-95');
                                                    setIsDraggingBanners(true); // Ativa injeção CSS global
                                                },
                                                onDragEnter: (e) => { dragOverItem.current = index; },
                                                onDragEnd: (e) => {
                                                    e.currentTarget.classList.remove('opacity-50', 'scale-95');
                                                    setIsDraggingBanners(false); // Desativa injeção CSS global
                                                    handleSortBanners();
                                                },
                                                onDragOver: (e) => e.preventDefault()
                                            } : {};

                                            if (s.isInternal) {
                                                return (
                                                    <button
                                                        key={banner.id}
                                                        onClick={() => !isDisabledForUser && setCurrentView('search')}
                                                        disabled={isDisabledForUser}
                                                        className={cardClass}
                                                        {...dragProps}
                                                    >
                                                        {content}
                                                    </button>
                                                );
                                            }
                                            return (
                                                <a
                                                    key={banner.id}
                                                    href={isDisabledForUser ? undefined : s.href}
                                                    target={isDisabledForUser ? undefined : '_blank'}
                                                    rel="noopener noreferrer"
                                                    className={cardClass}
                                                    onClick={isDisabledForUser ? (e) => e.preventDefault() : undefined}
                                                    {...dragProps}
                                                >
                                                    {content}
                                                </a>
                                            );
                                        })
                                    }
                                </div>
                            </div>
                        )}

                        {currentView === 'search' && (
                            <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-2xl shadow-2xl border backdrop-blur-sm p-8 mb-8 animate-fadeInUp`} style={{ animationDelay: '0.2s' }}>
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
                                            className={`px-6 py-3 rounded-lg text-sm font-medium transition-all duration-300 flex items-center gap-2 ${searchMode === 'universal'
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
                                            className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 flex items-center gap-2 ${searchMode === 'advanced'
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

                                            <div className="space-y-2 animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
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

                                            <div className="space-y-2 animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
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

                                            <div className="space-y-2 animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
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
                        )}

                        {/* View Admin: Gestão de Usuários */}
                        {currentUser?.role === 'admin' && currentView === 'admin-users' && (
                            <div className={`mb-8 p-6 rounded-xl border-2 ${darkMode ? 'border-red-600 bg-gray-800' : 'border-red-300 bg-red-50'} animate-fadeInUp`}>
                                <h2 className={`text-2xl font-bold mb-6 ${darkMode ? 'text-red-400' : 'text-red-700'} flex items-center gap-2`}>
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                                    </svg>
                                    Gestão de Usuários
                                </h2>
                                {pendingUsers.length > 0 && (
                                    <div className={`mb-6 p-4 rounded-lg border-2 border-yellow-400 ${darkMode ? 'bg-yellow-900/20' : 'bg-yellow-50'}`}>
                                        <h3 className={`font-bold mb-3 ${darkMode ? 'text-yellow-400' : 'text-yellow-700'}`}>Solicitações pendentes ({pendingUsers.length})</h3>
                                        <div className="grid gap-3 md:grid-cols-2">
                                            {pendingUsers.map(user => (
                                                <div key={user.id} className={`p-3 rounded-lg flex justify-between items-center ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                                                    <div>
                                                        <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{user.name}</p>
                                                        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{user.username}</p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleAuthorizeUser(user.id)}
                                                            className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                            Autorizar
                                                        </button>
                                                        <button
                                                            onClick={async () => {
                                                                if (confirm(`Rejeitar e excluir o cadastro de "${user.name}" (${user.username})?`)) {
                                                                    try {
                                                                        await ApiService.deleteUser(user.id);
                                                                        await loadPendingUsers();
                                                                        setAdminUsersListKey(k => k + 1);
                                                                    } catch (err) {
                                                                        alert('Erro ao rejeitar solicitação: ' + err.message);
                                                                    }
                                                                }
                                                            }}
                                                            className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                            Rejeitar
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <div className={`rounded-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'} overflow-hidden`}>
                                    <AdminUsersTable
                                        darkMode={darkMode}
                                        adminUsersListKey={adminUsersListKey}
                                        onRefreshNeeded={() => {
                                            loadPendingUsers();
                                            setAdminUsersListKey(k => k + 1);
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* View Admin: Controle de Banners */}
                        {currentUser?.role === 'admin' && currentView === 'admin-banners' && (
                            <AdminBannersPanel darkMode={darkMode} />
                        )}


                        {/* Painel Administrativo - Apenas para Admins - Visível apenas na view admin-dashboard */}
                        {currentUser?.role === 'admin' && currentView === 'admin-dashboard' && (
                            <div className="animate-fadeInUp space-y-6">
                                {/* Cabeçalho Premium */}
                                <div className={`p-6 rounded-2xl ${darkMode ? 'bg-gradient-to-r from-blue-900/40 via-purple-900/30 to-indigo-900/40 border border-blue-800/40' : 'bg-gradient-to-r from-blue-50 via-purple-50 to-indigo-50 border border-blue-100'} backdrop-blur-sm`}>
                                    <div className="flex items-center justify-between flex-wrap gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${darkMode ? 'bg-gradient-to-br from-blue-500 to-purple-600' : 'bg-gradient-to-br from-blue-600 to-purple-700'}`}>
                                                <svg className="w-7 h-7 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h2 className={`text-2xl font-extrabold tracking-tight ${darkMode ? 'text-white' : 'text-gray-900'}`}>Dashboard</h2>
                                                <p className={`text-sm font-medium ${darkMode ? 'text-blue-300/80' : 'text-blue-600/80'}`}>Painel Administrativo • {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                                            </div>
                                        </div>
                                        <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider ${darkMode ? 'bg-green-900/40 text-green-400 border border-green-700/50' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                            Sistema Online
                                        </div>
                                    </div>
                                </div>
                                {/* Solicitações Pendentes */}
                                {pendingUsers.length > 0 && (
                                    <div className={`p-5 rounded-2xl border-2 ${darkMode ? 'border-yellow-500/40 bg-yellow-900/10 backdrop-blur-sm' : 'border-yellow-300 bg-yellow-50'}`}>
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-10 h-10 rounded-xl bg-yellow-500 flex items-center justify-center shadow-lg">
                                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                </svg>
                                            </div>
                                            <span className={`font-bold text-lg ${darkMode ? 'text-yellow-400' : 'text-yellow-700'}`}>Solicitações Pendentes ({pendingUsers.length})</span>
                                        </div>
                                        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                                            {pendingUsers.map(user => (
                                                <div key={user.id} className={`p-3 rounded-xl flex flex-col justify-between ${darkMode ? 'bg-gray-800/80 border border-gray-700' : 'bg-white border border-gray-100'} shadow-sm`}>
                                                    <div className="mb-2">
                                                        <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{user.name}</p>
                                                        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{user.email}</p>
                                                    </div>
                                                    <button onClick={() => handleAuthorizeUser(user.id)} className="w-full py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-colors">Autorizar</button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* KPI Cards Premium */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {[
                                        { label: 'Acessos Totais', value: statistics.totalAccesses, sub: 'Desde o início', grad: darkMode ? 'from-blue-900/60 to-blue-800/40' : 'from-blue-500 to-blue-600', iBg: darkMode ? 'bg-blue-500/20' : 'bg-white/20', d: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
                                        { label: 'Consultas', value: statistics.totalSearches, sub: 'Total realizadas', grad: darkMode ? 'from-emerald-900/60 to-emerald-800/40' : 'from-emerald-500 to-emerald-600', iBg: darkMode ? 'bg-emerald-500/20' : 'bg-white/20', d: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
                                        { label: 'Hoje', value: statistics.dailyAccesses[new Date().toDateString()] || 0, sub: 'Acessos hoje', grad: darkMode ? 'from-orange-900/60 to-orange-800/40' : 'from-orange-500 to-orange-600', iBg: darkMode ? 'bg-orange-500/20' : 'bg-white/20', d: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
                                        { label: 'Usuários', value: statistics.userSessions ? Object.keys(statistics.userSessions).length : 0, sub: 'Únicos registrados', grad: darkMode ? 'from-purple-900/60 to-purple-800/40' : 'from-purple-500 to-purple-600', iBg: darkMode ? 'bg-purple-500/20' : 'bg-white/20', d: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z' }
                                    ].map((k, i) => (
                                        <div key={i} className={`p-5 rounded-2xl bg-gradient-to-br ${k.grad} ${darkMode ? 'border border-white/5' : 'text-white'} shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1`} style={{ animationDelay: `${i * 0.1}s` }}>
                                            <div className="flex items-center justify-between mb-3">
                                                <span className={`text-sm font-semibold ${darkMode ? 'text-gray-200' : 'text-white/90'}`}>{k.label}</span>
                                                <div className={`w-10 h-10 rounded-xl ${k.iBg} flex items-center justify-center`}>
                                                    <svg className={`w-5 h-5 ${darkMode ? 'text-white/80' : 'text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={k.d} />
                                                    </svg>
                                                </div>
                                            </div>
                                            <p className="text-3xl font-black mb-1 text-white">{k.value}</p>
                                            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-white/70'}`}>{k.sub}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Gráficos */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className={`rounded-2xl overflow-hidden ${darkMode ? 'bg-gray-800/60 border border-gray-700/50 backdrop-blur-sm' : 'bg-white border border-gray-100 shadow-sm'}`}>
                                        <VerticalBarChart title="Acessos por Usuário" darkMode={darkMode} color="purple" data={Object.entries(statistics.userSessions || {}).map(([user, count]) => ({ label: user, value: count }))} />
                                    </div>
                                    <div className={`rounded-2xl overflow-hidden ${darkMode ? 'bg-gray-800/60 border border-gray-700/50 backdrop-blur-sm' : 'bg-white border border-gray-100 shadow-sm'}`}>
                                        <PieChart title="Consultas por Usuário" darkMode={darkMode} data={(() => { const c = {}; statistics.searchHistory.forEach(s => { c[s.user] = (c[s.user] || 0) + 1; }); return Object.entries(c).map(([u, v]) => ({ label: u, value: v })).sort((a, b) => b.value - a.value); })()} />
                                    </div>
                                </div>

                                {/* Timeline de Consultas */}
                                <div className={`p-5 rounded-2xl ${darkMode ? 'bg-gray-800/60 border border-gray-700/50 backdrop-blur-sm' : 'bg-white border border-gray-100 shadow-sm'}`}>
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${darkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        </div>
                                        <h4 className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Últimas Consultas</h4>
                                    </div>
                                    <div className="space-y-3 max-h-48 overflow-y-auto custom-scrollbar">
                                        {statistics.searchHistory.slice(-6).reverse().map((search, index) => (
                                            <div key={index} className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${darkMode ? 'bg-gray-700/50 hover:bg-gray-700' : 'bg-gray-50 hover:bg-gray-100'}`}>
                                                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${darkMode ? 'bg-gradient-to-br from-blue-600 to-purple-600 text-white' : 'bg-gradient-to-br from-blue-500 to-purple-600 text-white'}`}>
                                                    {search.user?.substring(0, 2).toUpperCase() || '??'}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-sm font-semibold truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>{search.user}</p>
                                                    <p className={`text-xs truncate ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{search.query}</p>
                                                </div>
                                                <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${darkMode ? 'bg-blue-900/40 text-blue-300' : 'bg-blue-50 text-blue-700'}`}>{search.results} res.</span>
                                            </div>
                                        ))}
                                        {statistics.searchHistory.length === 0 && (
                                            <p className={`text-sm text-center py-6 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Nenhuma consulta realizada recentemente</p>
                                        )}
                                    </div>
                                </div>

                                {/* Info do Sistema + Ações */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className={`p-4 rounded-2xl flex items-center gap-3 ${darkMode ? 'bg-gray-800/60 border border-gray-700/50' : 'bg-white border border-gray-100 shadow-sm'}`}>
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${darkMode ? 'bg-sky-500/20 text-sky-400' : 'bg-sky-100 text-sky-600'}`}>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" /></svg>
                                        </div>
                                        <div>
                                            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Itens na Base</p>
                                            <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{data.length}</p>
                                        </div>
                                    </div>
                                    <div className={`p-4 rounded-2xl flex items-center gap-3 ${darkMode ? 'bg-gray-800/60 border border-gray-700/50' : 'bg-white border border-gray-100 shadow-sm'}`}>
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${darkMode ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-600'}`}>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        </div>
                                        <div>
                                            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Último Acesso</p>
                                            <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{statistics.lastAccess ? new Date(statistics.lastAccess).toLocaleString('pt-BR') : 'N/A'}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <button className={`flex-1 px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${darkMode ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/30' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200'}`}>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                            Exportar
                                        </button>
                                        <button
                                            onClick={() => { if (confirm('Tem certeza que deseja limpar todas as estatísticas?')) { localStorage.removeItem('appStatistics'); setStatistics({ totalAccesses: 0, totalSearches: 0, universalSearches: 0, advancedSearches: 0, lastAccess: null, dailyAccesses: {}, searchHistory: [], userSessions: {} }); } }}
                                            className={`flex-1 px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${darkMode ? 'bg-red-600/80 hover:bg-red-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-200'}`}
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            Limpar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

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
                                            <div className="overflow-x-auto custom-scrollbar px-6" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                                                <table className={`min-w-full ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                                                    <thead className={`sticky top-0 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} z-10`}>
                                                        <tr>
                                                            <th className={`px-4 py-3 text-center text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300 border-gray-600' : 'text-gray-500 border-gray-200'
                                                                } border-b`}>
                                                                Código do Item
                                                            </th>
                                                            <th className={`px-4 py-3 text-center text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300 border-gray-600' : 'text-gray-500 border-gray-200'
                                                                } border-b`}>
                                                                Descrição do Serviço
                                                            </th>
                                                            <th className={`px-4 py-3 text-center text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300 border-gray-600' : 'text-gray-500 border-gray-200'
                                                                } border-b`}>
                                                                CNAE
                                                            </th>
                                                            <th className={`px-4 py-3 text-center text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300 border-gray-600' : 'text-gray-500 border-gray-200'
                                                                } border-b`}>
                                                                Descrição CNAE
                                                            </th>
                                                            <th className={`px-4 py-3 text-center text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300 border-gray-600' : 'text-gray-500 border-gray-200'
                                                                } border-b`}>
                                                                Alíquota ISS
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className={`divide-y ${darkMode ? 'divide-gray-600' : 'divide-gray-200'}`}>
                                                        {modalResults.slice(0, 100).map((item, index) => (
                                                            <tr key={index} className={`hover:${darkMode ? 'bg-gray-700' : 'bg-gray-50'} transition-all duration-300 hover:scale-[1.02]`}>
                                                                <td className={`px-4 py-4 whitespace-nowrap text-sm text-center ${darkMode ? 'text-blue-300' : 'text-blue-600'
                                                                    } font-medium`}>
                                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${darkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'
                                                                        }`}>
                                                                        {item["LIST LC"].replace(/^0+/, '') || item["LIST LC"]}
                                                                    </span>
                                                                </td>
                                                                <td className={`px-4 py-4 text-sm text-center ${darkMode ? 'text-gray-300' : 'text-gray-900'
                                                                    } max-w-xs`}>
                                                                    <div className="line-clamp-3">
                                                                        {item["Descrição item da lista da Lei Complementar nº 001/2003 - CTM"]}
                                                                    </div>
                                                                </td>
                                                                <td className={`px-4 py-4 whitespace-nowrap text-sm text-center ${darkMode ? 'text-green-300' : 'text-green-600'
                                                                    } font-medium`}>
                                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${darkMode ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800'
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
                                                                <td className={`px-4 py-4 text-sm text-center ${darkMode ? 'text-gray-300' : 'text-gray-900'
                                                                    } max-w-xs`}>
                                                                    <div className="line-clamp-3">
                                                                        {item["Descrição do CNAE"]}
                                                                    </div>
                                                                </td>
                                                                <td className={`px-4 py-4 whitespace-nowrap text-sm text-center font-bold ${darkMode ? 'text-yellow-300' : 'text-yellow-600'
                                                                    }`}>
                                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border-2 ${darkMode ? 'bg-yellow-900 text-yellow-200 border-yellow-600' : 'bg-yellow-100 text-yellow-800 border-yellow-400'
                                                                        }`}>
                                                                        {item["Alíquota"]}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>

                                            <div className={`px-6 py-4 border-t ${darkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-gray-50'
                                                } rounded-b-lg`}>
                                                <div className="flex items-center justify-between">
                                                    <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'
                                                        }`}>
                                                        <span className="font-medium">
                                                            Mostrando {Math.min(100, modalResults.length)} de {modalResults.length} resultado{modalResults.length !== 1 ? 's' : ''}
                                                        </span>
                                                        {modalResults.length > 100 && (
                                                            <span className={`ml-2 text-xs px-2 py-1 rounded-full ${darkMode ? 'bg-yellow-900 text-yellow-200' : 'bg-yellow-100 text-yellow-800'
                                                                }`}>
                                                                Primeiros 100 resultados
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'
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

                        <footer className={`fixed bottom-4 left-1/2 -translate-x-1/2 text-xs font-semibold leading-tight transition-colors duration-500 select-none pointer-events-none whitespace-nowrap px-4 py-2 rounded-full backdrop-blur-sm ${darkMode ? 'text-gray-400 bg-gray-900/20' : 'text-gray-500 bg-white/20'}`}>
                            <p>© 2025 Ecossistema DIAAF · <span className={`${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>Murilo Miguel</span> 🚀</p>
                        </footer>
                    </div>
                </div >
            </div >
        </div >
    );
}

(function mountApp() {
    if (window.__USE_HTTP_SERVER__ === false) return;
    var rootElement = document.getElementById('root');
    if (!rootElement) return;
    var fallback = document.getElementById('load-fallback');
    try {
        if (typeof React === 'undefined' || typeof ReactDOM === 'undefined') {
            throw new Error('React ou ReactDOM não carregaram. Verifique sua conexão com a internet.');
        }
        window.__APP_LOADED__ = true;
        var root = ReactDOM.createRoot(rootElement);
        root.render(<ErrorBoundary><App /></ErrorBoundary>);
        if (fallback) fallback.style.display = 'none';
    } catch (err) {
        window.__APP_LOAD_FAILED__ = true;
        if (fallback) {
            fallback.style.display = 'block';
            var msgEl = document.getElementById('load-error-msg');
            if (msgEl) msgEl.textContent = (err && (err.message || err.toString())) || 'Erro ao carregar a aplicação.';
        }
        console.error('Erro ao renderizar:', err);
    }
})();