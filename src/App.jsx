import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { LayoutDashboard, Database, History, Calculator, Menu } from 'lucide-react';

// Componentes placeholders para testarmos as rotas
// const Dashboard = () => <div className="p-6"><h1 className="text-2xl font-bold text-brand-green">Jogos do Dia</h1><p>Lista de jogos aqui...</p></div>;
import Dashboard from './pages/Dashboard.jsx';
// const ImportData = () => <div className="p-6"><h1 className="text-2xl font-bold text-brand-green">Importação de Dados</h1><p>Área de upload dos CSVs...</p></div>;
import ImportData from './pages/ImportData.jsx';
// const Methods = () => <div className="p-6"><h1 className="text-2xl font-bold text-brand-green">Métodos</h1><p>Gestão Under 85, Over 2.5...</p></div>;
import Methods from './pages/Methods.jsx';
// const Results = () => <div className="p-6"><h1 className="text-2xl font-bold text-brand-green">Resultados Passados</h1><p>Histórico e análise...</p></div>;
import Results from './pages/Results.jsx';

function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen bg-brand-dark text-text-primary">
        {/* Sidebar */}
        <aside className="w-64 bg-brand-card border-r border-brand-gray flex flex-col">
          <div className="p-4 border-b border-brand-gray flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-green rounded-full flex items-center justify-center text-brand-dark font-bold">OC</div>
            <span className="font-bold text-lg tracking-wider">ODD CIENTÍFICA</span>
          </div>
          
          <nav className="flex-1 p-4 space-y-2">
            <NavItem to="/" icon={<LayoutDashboard size={20} />} label="Jogos do Dia" />
            <NavItem to="/methods" icon={<Calculator size={20} />} label="Métodos" />
            <NavItem to="/history" icon={<History size={20} />} label="Resultados Passados" />
            <div className="pt-4 mt-4 border-t border-brand-gray">
              <NavItem to="/import" icon={<Database size={20} />} label="Importar CSVs" />
            </div>
          </nav>

          <div className="p-4 text-xs text-text-secondary text-center">
            v1.0.0 - Full Stack JS
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto bg-brand-dark">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/methods" element={<Methods />} />
            <Route path="/history" element={<Results />} />
            <Route path="/import" element={<ImportData />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

// Componente auxiliar de Menu
const NavItem = ({ to, icon, label }) => (
  <Link 
    to={to} 
    className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-brand-gray transition-colors text-text-secondary hover:text-brand-green"
  >
    {icon}
    <span className="font-medium">{label}</span>
  </Link>
);

export default App;