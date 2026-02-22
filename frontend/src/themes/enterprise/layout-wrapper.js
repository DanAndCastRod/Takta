export class LayoutWrapper {
    constructor() {
        this.appContainer = document.querySelector('#app');
    }

    renderEnterpriseStructure(contentFn) {
        // Estructura oficial de Bios Design System
        /*
        <div class="app-container app-theme-white fixed-header fixed-sidebar">
            <header><navbarGB></navbarGB></header>
            <div class="app-main">
                <sidebarGB></sidebarGB>
                <div class="app-main__outer">
                    <div class="app-main__inner">
                        <!-- Content -->
                    </div>
                </div>
            </div>
        </div>
        */

        // 1. Crear wrappers
        const appContainer = document.createElement('div');
        appContainer.className = 'app-container app-theme-white fixed-header fixed-sidebar';

        const header = document.createElement('header');
        header.innerHTML = '<navbarGB></navbarGB>'; // Custom Element de Bios

        const appMain = document.createElement('div');
        appMain.className = 'app-main';

        const sidebar = document.createElement('sidebarGB'); // Custom Element de Bios

        const mainOuter = document.createElement('div');
        mainOuter.className = 'app-main__outer';

        const mainInner = document.createElement('div');
        mainInner.className = 'app-main__inner';
        mainInner.id = 'takta-content-area';

        // 2. Ensamblar
        mainOuter.appendChild(mainInner);
        appMain.appendChild(sidebar);
        appMain.appendChild(mainOuter);

        appContainer.appendChild(header);
        appContainer.appendChild(appMain);

        // 3. Reemplazar contenido
        this.appContainer.innerHTML = '';
        this.appContainer.appendChild(appContainer);

        // 4. Inyectar contenido dinámico
        if (contentFn) contentFn(mainInner);
    }

    renderCommunityStructure(contentFn) {
        // Estructura simple para Community
        // <div class="container mx-auto p-4"> ... </div>

        this.appContainer.innerHTML = '';
        const container = document.createElement('div');
        container.className = 'container mx-auto p-4';
        container.id = 'takta-content-area';

        this.appContainer.appendChild(container);

        if (contentFn) contentFn(container);
    }
}

export const TaktaLayout = new LayoutWrapper();
