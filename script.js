const { useState, useEffect } = React;

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
class UserManager {
    static initializeUsers() {
        const existingUsers = localStorage.getItem('userProfiles');
        
        if (!existingUsers) {
            // Migração dos usuários existentes
            const defaultUsers = [
                { username: 'admin', password: '123456', role: 'admin', name: 'Administrador' },
                { username: 'user', password: '123', role: 'user', name: 'Usuário' },
                { username: 'consultor', password: '456', role: 'user', name: 'Consultor' }
            ];
            
            const migratedUsers = defaultUsers.map((user, index) => ({
                id: `user_${index + 1}`,
                username: user.username,
                password: CryptoUtils.hashPassword(user.password),
                role: user.role,
                name: user.name,
                email: '',
                firstLogin: true,
                lastPasswordChange: new Date().toISOString(),
                passwordHistory: [CryptoUtils.hashPassword(user.password)],
                accountLocked: false,
                failedAttempts: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }));
            
            localStorage.setItem('userProfiles', JSON.stringify(migratedUsers));
            return migratedUsers;
        }
        
        return JSON.parse(existingUsers);
    }
    
    static getUsers() {
        return JSON.parse(localStorage.getItem('userProfiles') || '[]');
    }
    
    static updateUser(userId, updates) {
        const users = UserManager.getUsers();
        const userIndex = users.findIndex(user => user.id === userId);
        
        if (userIndex !== -1) {
            users[userIndex] = {
                ...users[userIndex],
                ...updates,
                updatedAt: new Date().toISOString()
            };
            
            localStorage.setItem('userProfiles', JSON.stringify(users));
            return users[userIndex];
        }
        
        return null;
    }
    
    static checkPasswordHistory(userId, newPassword) {
        const users = UserManager.getUsers();
        const user = users.find(u => u.id === userId);
        
        if (!user) return false;
        
        const newPasswordHash = CryptoUtils.hashPassword(newPassword);
        const recentPasswords = user.passwordHistory.slice(-passwordRules.preventReuse);
        
        return !recentPasswords.includes(newPasswordHash);
    }
    
    static logAuditEvent(userId, action, details = {}) {
        const auditLog = JSON.parse(localStorage.getItem('auditLog') || '[]');
        
        const event = {
            userId,
            action,
            timestamp: new Date().toISOString(),
            ipAddress: 'localhost', // Simulação
            userAgent: navigator.userAgent,
            success: details.success !== false,
            details
        };
        
        auditLog.push(event);
        
        // Manter apenas os últimos 1000 eventos
        if (auditLog.length > 1000) {
            auditLog.splice(0, auditLog.length - 1000);
        }
        
        localStorage.setItem('auditLog', JSON.stringify(auditLog));
    }
    
    static incrementFailedAttempts(userId) {
        const users = this.getUsers();
        const userIndex = users.findIndex(u => u.id === userId);
        
        if (userIndex === -1) return null;
        
        const user = users[userIndex];
        const newFailedAttempts = (user.failedAttempts || 0) + 1;
        
        const updates = {
            failedAttempts: newFailedAttempts
        };
        
        // Bloquear conta após 5 tentativas
        if (newFailedAttempts >= 5) {
            const lockUntil = new Date();
            lockUntil.setMinutes(lockUntil.getMinutes() + 30); // 30 minutos
            
            updates.isLocked = true;
            updates.lockUntil = lockUntil.toISOString();
        }
        
        return this.updateUser(userId, updates);
    }
    
    static resetFailedAttempts(userId) {
        return this.updateUser(userId, {
            failedAttempts: 0,
            isLocked: false,
            lockUntil: null
        });
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
        
        // Validar username
        const usernameValidation = CredentialValidator.validateUsername(formData.username);
        if (!usernameValidation.isValid) {
            newErrors.username = usernameValidation.errors[0];
        } else {
            // Verificar disponibilidade do username
            const users = UserManager.getUsers();
            const isAvailable = CredentialValidator.checkUsernameAvailability(
                formData.username, 
                user.id, 
                users
            );
            if (!isAvailable) {
                newErrors.username = 'Nome de usuário já está em uso';
            }
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
                } else {
                    // Verificar histórico de senhas
                    const isPasswordReused = !UserManager.checkPasswordHistory(user.id, formData.newPassword);
                    if (isPasswordReused) {
                        newErrors.newPassword = `Não é possível reutilizar uma das últimas ${passwordRules.preventReuse} senhas`;
                    }
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
                const hashedPassword = CryptoUtils.hashPassword(formData.newPassword);
                updates.password = hashedPassword;
                updates.lastPasswordChange = new Date().toISOString();
                
                // Atualizar histórico de senhas
                const currentHistory = user.passwordHistory || [];
                updates.passwordHistory = [...currentHistory, hashedPassword].slice(-passwordRules.preventReuse);
            }
            
            // Atualizar usuário
            const updatedUser = UserManager.updateUser(user.id, updates);
            
            if (updatedUser) {
                // Log da alteração
                UserManager.logAuditEvent(user.id, 'profile_update', {
                    fields: Object.keys(updates),
                    passwordChanged: showPasswordFields && formData.newPassword
                });
                
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

    return (
        <div className={`profile-container ${darkMode ? 'dark' : ''}`}>
            <div className="profile-header">
                <h2>Meu Perfil</h2>
                <button 
                    onClick={onLogout}
                    className="logout-btn"
                >
                    Sair
                </button>
            </div>
            
            {successMessage && (
                <div className="success-message">
                    {successMessage}
                </div>
            )}
            
            {errors.general && (
                <div className="error-message">
                    {errors.general}
                </div>
            )}
            
            <div className="profile-content">
                <div className="profile-info">
                    <h3>Informações Pessoais</h3>
                    
                    {!isEditing ? (
                        <div className="info-display">
                            <div className="info-item">
                                <label>Nome:</label>
                                <span>{user.name || 'Não informado'}</span>
                            </div>
                            <div className="info-item">
                                <label>Email:</label>
                                <span>{user.email || 'Não informado'}</span>
                            </div>
                            <div className="info-item">
                                <label>Usuário:</label>
                                <span>{user.username}</span>
                            </div>
                            <div className="info-item">
                                <label>Último acesso:</label>
                                <span>{user.lastLogin ? new Date(user.lastLogin).toLocaleString('pt-BR') : 'Primeiro acesso'}</span>
                            </div>
                            <div className="info-item">
                                <label>Última alteração de senha:</label>
                                <span>{user.lastPasswordChange ? new Date(user.lastPasswordChange).toLocaleString('pt-BR') : 'Nunca alterada'}</span>
                            </div>
                            
                            <button 
                                onClick={() => setIsEditing(true)}
                                className="edit-btn"
                            >
                                Editar Perfil
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="profile-form">
                            <div className="form-group">
                                <label>Nome:</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => handleInputChange('name', e.target.value)}
                                    className={errors.name ? 'error' : ''}
                                    disabled={isLoading}
                                />
                                {errors.name && <span className="error-text">{errors.name}</span>}
                            </div>
                            
                            <div className="form-group">
                                <label>Email:</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => handleInputChange('email', e.target.value)}
                                    className={errors.email ? 'error' : ''}
                                    disabled={isLoading}
                                />
                                {errors.email && <span className="error-text">{errors.email}</span>}
                            </div>
                            
                            <div className="form-group">
                                <label>Nome de usuário:</label>
                                <input
                                    type="text"
                                    value={formData.username}
                                    onChange={(e) => handleInputChange('username', e.target.value)}
                                    className={errors.username ? 'error' : ''}
                                    disabled={isLoading}
                                />
                                {errors.username && <span className="error-text">{errors.username}</span>}
                            </div>
                            
                            <div className="password-section">
                                <div className="password-toggle">
                                    <input
                                        type="checkbox"
                                        id="changePassword"
                                        checked={showPasswordFields}
                                        onChange={(e) => setShowPasswordFields(e.target.checked)}
                                        disabled={isLoading}
                                    />
                                    <label htmlFor="changePassword">Alterar senha</label>
                                </div>
                                
                                {showPasswordFields && (
                                    <div className="password-fields">
                                        <div className="form-group">
                                            <label>Senha atual:</label>
                                            <input
                                                type="password"
                                                value={formData.currentPassword}
                                                onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                                                className={errors.currentPassword ? 'error' : ''}
                                                disabled={isLoading}
                                            />
                                            {errors.currentPassword && <span className="error-text">{errors.currentPassword}</span>}
                                        </div>
                                        
                                        <div className="form-group">
                                            <label>Nova senha:</label>
                                            <input
                                                type="password"
                                                value={formData.newPassword}
                                                onChange={(e) => handleInputChange('newPassword', e.target.value)}
                                                className={errors.newPassword ? 'error' : ''}
                                                disabled={isLoading}
                                            />
                                            {errors.newPassword && <span className="error-text">{errors.newPassword}</span>}
                                            
                                            {formData.newPassword && (
                                                <PasswordStrengthIndicator 
                                                    password={formData.newPassword} 
                                                    darkMode={darkMode}
                                                />
                                            )}
                                        </div>
                                        
                                        <div className="form-group">
                                            <label>Confirmar nova senha:</label>
                                            <input
                                                type="password"
                                                value={formData.confirmPassword}
                                                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                                                className={errors.confirmPassword ? 'error' : ''}
                                                disabled={isLoading}
                                            />
                                            {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            <div className="form-actions">
                                <button 
                                    type="button" 
                                    onClick={handleCancel}
                                    className="cancel-btn"
                                    disabled={isLoading}
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit" 
                                    className="save-btn"
                                    disabled={isLoading}
                                >
                                    {isLoading ? 'Salvando...' : 'Salvar Alterações'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}

// Componente de Login
function LoginForm({ onLogin, darkMode }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showFirstLoginModal, setShowFirstLoginModal] = useState(false);
    const [firstLoginUser, setFirstLoginUser] = useState(null);
    
    // Inicializar usuários quando o componente monta
    useEffect(() => {
        UserManager.initializeUsers();
    }, []);
    
    const handleFirstLoginComplete = (updatedUser) => {
        setShowFirstLoginModal(false);
        setFirstLoginUser(null);
        
        // Salvar no localStorage
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        
        onLogin(updatedUser);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        
        try {
            const users = UserManager.getUsers();
            const user = users.find(u => u.username === username);
            
            if (!user) {
                setError('Usuário não encontrado');
                UserManager.logAuditEvent(null, 'login_failed', { username, reason: 'user_not_found' });
                return;
            }
            
            // Verificar se a conta está bloqueada
            if (user.isLocked && user.lockUntil && new Date() < new Date(user.lockUntil)) {
                const lockTime = Math.ceil((new Date(user.lockUntil) - new Date()) / 60000);
                setError(`Conta bloqueada. Tente novamente em ${lockTime} minutos.`);
                UserManager.logAuditEvent(user.id, 'login_blocked', { lockTime });
                return;
            }
            
            // Verificar senha
            if (!CryptoUtils.comparePassword(password, user.password)) {
                const updatedUser = UserManager.incrementFailedAttempts(user.id);
                
                if (updatedUser.failedAttempts >= 5) {
                    setError('Conta bloqueada por 30 minutos devido a muitas tentativas incorretas.');
                    UserManager.logAuditEvent(user.id, 'account_locked', { attempts: updatedUser.failedAttempts });
                } else {
                    const remaining = 5 - updatedUser.failedAttempts;
                    setError(`Senha incorreta. ${remaining} tentativas restantes.`);
                    UserManager.logAuditEvent(user.id, 'login_failed', { reason: 'wrong_password', attempts: updatedUser.failedAttempts });
                }
                return;
            }
            
            // Login bem-sucedido - resetar tentativas falhadas
            UserManager.resetFailedAttempts(user.id);
            UserManager.logAuditEvent(user.id, 'login_success', { timestamp: new Date().toISOString() });
            
            // Verificar se é primeiro login
            if (user.firstLogin) {
                setFirstLoginUser(user);
                setShowFirstLoginModal(true);
                return;
            }
            
            // Salvar no localStorage
            localStorage.setItem('isAuthenticated', 'true');
            localStorage.setItem('currentUser', JSON.stringify(user));
            
            onLogin(user);
        } catch (error) {
            console.error('Erro no login:', error);
            setError('Erro interno. Tente novamente.');
        } finally {
            setIsLoading(false);
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
                            disabled={isLoading}
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                        >
                            {isLoading ? 'Entrando...' : 'Entrar'}
                        </button>
                    </div>
                </form>
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
                <span className={`text-xs font-medium ${
                    score <= 2 ? 'text-red-500' : 
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
            } else {
                const users = UserManager.getUsers();
                if (!CredentialValidator.checkUsernameAvailability(formData.username, user.id, users)) {
                    newErrors.username = 'Este nome de usuário já está em uso';
                }
            }
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
        
        // Verificar histórico de senhas
        if (formData.newPassword && !UserManager.checkPasswordHistory(user.id, formData.newPassword)) {
            newErrors.newPassword = 'Esta senha foi usada recentemente. Escolha uma diferente';
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) return;
        
        setIsSubmitting(true);
        
        try {
            // Atualizar usuário
            const updates = {
                name: formData.name,
                email: formData.email,
                username: formData.username,
                password: CryptoUtils.hashPassword(formData.newPassword),
                firstLogin: false,
                lastPasswordChange: new Date().toISOString(),
                passwordHistory: [...user.passwordHistory, CryptoUtils.hashPassword(formData.newPassword)]
            };
            
            const updatedUser = UserManager.updateUser(user.id, updates);
            
            UserManager.logAuditEvent(user.id, 'first_login_setup', {
                usernameChanged: formData.username !== user.username,
                emailAdded: !!formData.email
            });
            
            onComplete(updatedUser);
        } catch (error) {
            console.error('Erro ao atualizar usuário:', error);
            setErrors({ submit: 'Erro interno. Tente novamente.' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`max-w-md w-full mx-4 p-6 rounded-lg shadow-xl ${
                darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
            }`}>
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold mb-2">🔐 Primeiro Acesso</h2>
                    <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        Por segurança, você deve definir suas credenciais personalizadas.
                    </p>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Nome */}
                    <div>
                        <label className={`block text-sm font-medium mb-1 ${
                            darkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                            Nome Completo *
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                                darkMode 
                                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                                    : 'bg-white border-gray-300 text-gray-900'
                            } ${errors.name ? 'border-red-500' : ''}`}
                            placeholder="Seu nome completo"
                        />
                        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                    </div>
                    
                    {/* Email */}
                    <div>
                        <label className={`block text-sm font-medium mb-1 ${
                            darkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                            Email (opcional)
                        </label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                                darkMode 
                                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                                    : 'bg-white border-gray-300 text-gray-900'
                            }`}
                            placeholder="seu@email.com"
                        />
                    </div>
                    
                    {/* Username */}
                    <div>
                        <label className={`block text-sm font-medium mb-1 ${
                            darkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                            Nome de Usuário
                        </label>
                        <input
                            type="text"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                                darkMode 
                                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                                    : 'bg-white border-gray-300 text-gray-900'
                            } ${errors.username ? 'border-red-500' : ''}`}
                            placeholder="Seu nome de usuário"
                        />
                        {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username}</p>}
                    </div>
                    
                    {/* Nova Senha */}
                    <div>
                        <label className={`block text-sm font-medium mb-1 ${
                            darkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                            Nova Senha *
                        </label>
                        <input
                            type="password"
                            value={formData.newPassword}
                            onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                                darkMode 
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
                        <label className={`block text-sm font-medium mb-1 ${
                            darkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                            Confirmar Nova Senha *
                        </label>
                        <input
                            type="password"
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                                darkMode 
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
                
                <div className={`mt-4 text-xs text-center ${
                    darkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                    Esta configuração é obrigatória para sua segurança.
                </div>
            </div>
        </div>
    );
}

function App() {
    // Estados de autenticação
    const [isAuthenticated, setIsAuthenticated] = useState(() => {
        return localStorage.getItem('isAuthenticated') === 'true';
    });
    const [currentUser, setCurrentUser] = useState(() => {
        const savedUser = localStorage.getItem('currentUser');
        return savedUser ? JSON.parse(savedUser) : null;
    });
    
    // Estado de navegação
    const [currentView, setCurrentView] = useState('main'); // 'main' ou 'profile'
    
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
    
    // Estados para estatísticas de uso
    const [statistics, setStatistics] = useState(() => {
        const saved = localStorage.getItem('appStatistics');
        return saved ? JSON.parse(saved) : {
            totalAccesses: 0,
            totalSearches: 0,
            universalSearches: 0,
            advancedSearches: 0,
            lastAccess: null,
            dailyAccesses: [],
            searchHistory: [],
            userSessions: []
        };
    });

    // Funções para estatísticas
    const updateStatistics = (type, data = {}) => {
        const now = new Date();
        const today = now.toDateString();
        
        setStatistics(prev => {
            const newStats = { ...prev };
            
            switch(type) {
                case 'access':
                    newStats.totalAccesses += 1;
                    newStats.lastAccess = now.toISOString();
                    
                    // Atualizar acessos diários
                    const todayAccess = newStats.dailyAccesses.find(d => d.date === today);
                    if (todayAccess) {
                        todayAccess.count += 1;
                    } else {
                        newStats.dailyAccesses.push({ date: today, count: 1 });
                    }
                    
                    // Manter apenas últimos 30 dias
                    newStats.dailyAccesses = newStats.dailyAccesses.slice(-30);
                    
                    // Registrar sessão do usuário
                    newStats.userSessions.push({
                        user: data.username,
                        role: data.role,
                        timestamp: now.toISOString()
                    });
                    
                    // Manter apenas últimas 100 sessões
                    newStats.userSessions = newStats.userSessions.slice(-100);
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
        setCurrentView('main');
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
        <div className={`min-h-screen transition-all duration-500 ${darkMode ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50'}`}>
            <div className="container mx-auto px-4 py-8 max-w-6xl">
                <header className="text-center mb-12 animate-fadeInDown">
                    {/* Informações do usuário logado */}
                    <div className="flex justify-between items-center mb-6">
                        <div className={`flex items-center gap-3 px-4 py-2 rounded-lg ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} shadow-lg`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentUser?.role === 'admin' ? 'bg-red-500' : 'bg-blue-500'} text-white text-sm font-bold`}>
                                {currentUser?.role === 'admin' ? 'A' : 'U'}
                            </div>
                            <div className="text-left">
                                <div className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                    {currentUser?.name || 'Usuário'}
                                </div>
                                <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {currentUser?.role === 'admin' ? 'Administrador' : 'Usuário'}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setCurrentView(currentView === 'profile' ? 'main' : 'profile')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 transform hover:scale-105 ${darkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'} shadow-lg`}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                {currentView === 'profile' ? 'Voltar' : 'Perfil'}
                            </button>
                            <button
                                onClick={handleLogout}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 transform hover:scale-105 ${darkMode ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-red-500 hover:bg-red-600 text-white'} shadow-lg`}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                Sair
                            </button>
                        </div>
                    </div>
                    
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
                        {currentUser?.role === 'admin' && (
                            <span className="ml-2 px-2 py-1 bg-red-500 text-white text-xs rounded-full">
                                ADMIN
                            </span>
                        )}
                    </div>
                </header>

                <div className="flex justify-end items-center mb-6">
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

                {/* Navegação condicional entre views */}
                {currentView === 'profile' ? (
                    <UserProfilePage 
                        user={currentUser}
                        onLogout={handleLogout}
                        onCredentialsChanged={handleCredentialsChanged}
                        darkMode={darkMode}
                    />
                ) : (
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
                            {currentUser?.role === 'admin' && (
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
                            )}
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
                )}

                {/* Painel Informativo para Usuários Regulares */}
                {currentUser?.role === 'user' && (
                    <div className={`mb-8 p-6 rounded-xl border-2 border-dashed ${darkMode ? 'border-blue-600 bg-blue-900/20' : 'border-blue-300 bg-blue-50'} animate-fadeInUp`}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h3 className={`text-lg font-semibold ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>
                                Acesso de Usuário
                            </h3>
                        </div>
                        <div className={`text-sm ${darkMode ? 'text-blue-200' : 'text-blue-700'} space-y-2`}>
                            <p>• Você pode realizar consultas na base de dados</p>
                            <p>• Acesso limitado ao modo de pesquisa universal</p>
                            <p>• Para funcionalidades avançadas, entre em contato com o administrador</p>
                        </div>
                    </div>
                )}

                {/* Painel Administrativo - Apenas para Admins */}
                {currentUser?.role === 'admin' && (
                    <div className={`mb-8 p-6 rounded-xl border-2 border-dashed ${darkMode ? 'border-red-600 bg-red-900/20' : 'border-red-300 bg-red-50'} animate-fadeInUp`}>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            <h3 className={`text-lg font-bold ${darkMode ? 'text-red-400' : 'text-red-700'}`}>
                                Dashboard Administrativo
                            </h3>
                        </div>
                        
                        {/* Estatísticas Principais */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                            {/* Card de Acessos Totais */}
                            <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} shadow-sm`}>
                                <div className="flex items-center gap-2 mb-2">
                                    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                    <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Acessos Totais</span>
                                </div>
                                <p className={`text-2xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>{statistics.totalAccesses}</p>
                                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Desde o início</p>
                            </div>
                            
                            {/* Card de Consultas Realizadas */}
                            <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} shadow-sm`}>
                                <div className="flex items-center gap-2 mb-2">
                                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Consultas</span>
                                </div>
                                <p className={`text-2xl font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>{statistics.totalSearches}</p>
                                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total realizadas</p>
                            </div>
                            
                            {/* Card de Usuários Ativos */}
                            <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} shadow-sm`}>
                                <div className="flex items-center gap-2 mb-2">
                                    <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                                    </svg>
                                    <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Usuários Únicos</span>
                                </div>
                                <p className={`text-2xl font-bold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>{statistics.userSessions ? Object.keys(statistics.userSessions).length : 0}</p>
                                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Registrados</p>
                            </div>
                            
                            {/* Card de Acessos Hoje */}
                            <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} shadow-sm`}>
                                <div className="flex items-center gap-2 mb-2">
                                    <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Hoje</span>
                                </div>
                                <p className={`text-2xl font-bold ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>{statistics.dailyAccesses[new Date().toDateString()] || 0}</p>
                                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Acessos hoje</p>
                            </div>
                        </div>
                        
                        {/* Seção de Tipos de Consulta */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} shadow-sm`}>
                                <h4 className={`font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Tipos de Consulta</h4>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Universal:</span>
                                        <span className={`font-semibold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>{statistics.universalSearches}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Avançada:</span>
                                        <span className={`font-semibold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>{statistics.advancedSearches}</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                                        <div 
                                            className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-300" 
                                            style={{width: `${statistics.totalSearches > 0 ? (statistics.universalSearches / statistics.totalSearches) * 100 : 0}%`}}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} shadow-sm`}>
                                <h4 className={`font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Últimas Consultas</h4>
                                <div className="space-y-2 max-h-32 overflow-y-auto">
                                    {statistics.searchHistory.slice(-5).reverse().map((search, index) => (
                                        <div key={index} className={`text-xs p-2 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                                            <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{search.user}</div>
                                            <div className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} truncate`}>{search.query}</div>
                                            <div className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{search.results} resultados</div>
                                        </div>
                                    ))}
                                    {statistics.searchHistory.length === 0 && (
                                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Nenhuma consulta realizada ainda</p>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        {/* Informações do Sistema */}
                        <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} shadow-sm mb-4`}>
                            <h4 className={`font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Informações do Sistema</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                <div>
                                    <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total de Itens na Base:</span>
                                    <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{data.length}</p>
                                </div>
                                <div>
                                    <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Último Acesso:</span>
                                    <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{statistics.lastAccess ? new Date(statistics.lastAccess).toLocaleString('pt-BR') : 'N/A'}</p>
                                </div>
                                <div>
                                    <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Status do Sistema:</span>
                                    <p className={`font-semibold text-green-500`}>Online</p>
                                </div>
                            </div>
                        </div>
                        
                        {/* Botões de Ação */}
                        <div className="flex flex-wrap gap-3">
                            <button className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${darkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'} flex items-center gap-2`}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Exportar Estatísticas
                            </button>
                            <button 
                                onClick={() => {
                                    if (confirm('Tem certeza que deseja limpar todas as estatísticas?')) {
                                        localStorage.removeItem('appStatistics');
                                        setStatistics({
                                            totalAccesses: 0,
                                            totalSearches: 0,
                                            universalSearches: 0,
                                            advancedSearches: 0,
                                            lastAccess: null,
                                            dailyAccesses: [],
                                            searchHistory: [],
                                            userSessions: {}
                                        });
                                    }
                                }}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${darkMode ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-red-500 hover:bg-red-600 text-white'} flex items-center gap-2`}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Limpar Estatísticas
                            </button>
                            <button className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${darkMode ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-green-500 hover:bg-green-600 text-white'} flex items-center gap-2`}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                                Backup Sistema
                            </button>
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