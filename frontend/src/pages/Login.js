import ApiClient from '../services/api.client.js';

/**
 * Login Page
 */
const LoginPage = async () => {
    const container = document.createElement('div');
    container.className = 'flex items-center justify-center min-h-screen bg-slate-50 w-full absolute top-0 left-0 z-50';

    container.innerHTML = `
        <div class="w-full max-w-md p-8 bg-white rounded-xl shadow-lg border border-slate-100">
            <div class="text-center mb-8">
                <h1 class="text-3xl font-bold text-blue-800 tracking-tight">TAKTA</h1>
                <p class="text-slate-500 mt-2 text-sm uppercase tracking-widest font-semibold">OAC-SEO Foundation</p>
                <h2 class="text-xl font-semibold text-slate-800 mt-6">Iniciar Sesión</h2>
            </div>
            
            <form id="login-form" class="space-y-5">
                <div id="error-alert" class="hidden p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200"></div>
                
                <div>
                    <label for="username" class="block text-sm font-medium text-slate-700 mb-1">Usuario</label>
                    <input type="text" id="username" name="username" required autocomplete="username"
                        class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder-slate-400"
                        placeholder="Ej: admin">
                </div>
                
                <div>
                    <label for="password" class="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
                    <input type="password" id="password" name="password" required autocomplete="current-password"
                        class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder-slate-400"
                        placeholder="••••••••">
                </div>
                
                <button type="submit" id="submit-btn"
                    class="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors">
                    <span>Ingresar al Sistema</span>
                </button>
            </form>
            
            <div class="mt-8 pt-6 border-t border-slate-100 text-center">
                <p class="text-xs text-slate-400">
                    MVP Demo: Usa <code>admin</code> / <code>admin123</code> o <br><code>ingeniero</code> / <code>takta2026</code>
                </p>
            </div>
        </div>
    `;

    const form = container.querySelector('#login-form');
    const alert = container.querySelector('#error-alert');
    const submitBtn = container.querySelector('#submit-btn');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        alert.classList.add('hidden');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="animate-pulse">Autenticando...</span>';

        const formData = new FormData(form);

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: formData.get('username'),
                    password: formData.get('password')
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Error de autenticación');
            }

            const data = await response.json();

            // Log in successful, save token
            localStorage.setItem('takta_token', data.access_token);

            // Trigger auth event so main.js can update UI context
            window.dispatchEvent(new CustomEvent('auth:login_success'));

            // Navigate to main
            window.location.hash = '/';

        } catch (error) {
            alert.textContent = error.message;
            alert.classList.remove('hidden');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span>Ingresar al Sistema</span>';
        }
    });

    return container;
};

export default LoginPage;
