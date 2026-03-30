import ApiClient from '../services/api.client.js';
import { getRuntimeBrand } from '../services/tenant-ui.service.js';

/**
 * Login Page
 */
const LoginPage = async () => {
    const container = document.createElement('div');
    container.className = 'flex items-center justify-center min-h-screen bg-slate-50 w-full absolute top-0 left-0 z-50';
    const brand = getRuntimeBrand();
    const brandName = String(brand.brandName || 'TAKTA');
    const badgeLabel = String(brand.badgeLabel || 'OAC-SEO');
    const logoMarkup = brand.logoUrl
        ? `<img src="${brand.logoUrl}" alt="${brandName}" class="tk-brand-logo tk-brand-logo--lg mx-auto" loading="eager">`
        : `<div class="mx-auto h-14 w-14 rounded-2xl border border-brand-orange/20 bg-brand-orange/10 text-brand-orange flex items-center justify-center text-xl font-bold">${brandName.charAt(0).toUpperCase()}</div>`;

    container.innerHTML = `
        <div class="w-full max-w-md p-8 bg-white rounded-xl shadow-lg border border-slate-100">
            <div class="text-center mb-8">
                ${logoMarkup}
                <h1 class="text-3xl font-bold text-slate-900 tracking-tight mt-4">${brandName}</h1>
                <p class="text-brand-orange mt-2 text-sm uppercase tracking-widest font-semibold">${badgeLabel}</p>
                <h2 class="text-xl font-semibold text-slate-800 mt-6">Iniciar Sesión</h2>
            </div>
            
            <form id="login-form" class="space-y-5">
                <div id="error-alert" class="hidden p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200"></div>
                
                <div>
                    <label for="username" class="block text-sm font-medium text-slate-700 mb-1">Usuario</label>
                    <input type="text" id="username" name="username" required autocomplete="username"
                        class="w-full tk-input px-4 py-2 outline-none transition-all placeholder-slate-400"
                        placeholder="Ej: admin">
                </div>
                
                <div>
                    <label for="password" class="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
                    <input type="password" id="password" name="password" required autocomplete="current-password"
                        class="w-full tk-input px-4 py-2 outline-none transition-all placeholder-slate-400"
                        placeholder="********">
                </div>
                
                <button type="submit" id="submit-btn"
                    class="w-full flex justify-center py-2.5 px-4 tk-btn-primary shadow-sm text-sm">
                    <span>Ingresar al Sistema</span>
                </button>
            </form>
            
            <div class="mt-8 pt-6 border-t border-slate-100 text-center">
                <p class="text-xs text-slate-400">
                    MVP Demo: Usa <code>admin</code> / <code>admin123</code> o <br><code>ingeniero</code> / <code>takta2026</code>
                </p>
                <div class="mt-4 flex items-center justify-center gap-2">
                    <a href="#/landing" class="px-2.5 py-1.5 rounded-md border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50">Conocer la plataforma</a>
                    <a href="#/docs" class="px-2.5 py-1.5 rounded-md border border-brand-orange bg-brand-orange/10 text-xs font-semibold text-brand-orange hover:bg-cyan-100">Guia de usuario</a>
                </div>
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
                    password: formData.get('password'),
                }),
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
