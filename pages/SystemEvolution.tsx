
import React from 'react';
import { Card } from '../components/Layout';
import { 
  Database, Server, Cloud, Network, 
  CheckCircle2, Circle, Clock, 
  ShieldAlert, HardDrive, AlertTriangle, 
  FileWarning, Scale, LockKeyhole
} from 'lucide-react';

const PhaseCard = ({ title, period, icon: Icon, color, status, items }: any) => (
    <div className={`relative border-l-4 pl-6 pb-8 ${status === 'active' ? 'border-blue-600' : 'border-slate-200'}`}>
        <div className={`absolute -left-[14px] top-0 w-7 h-7 rounded-full border-4 border-white flex items-center justify-center ${status === 'active' ? `bg-${color}-600` : (status === 'done' ? 'bg-emerald-500' : 'bg-slate-300')}`}>
            {status === 'active' ? <CheckCircle2 size={16} className="text-white"/> : (status === 'done' ? <CheckCircle2 size={16} className="text-white"/> : <Circle size={16} className="text-white"/>)}
        </div>
        <div className={`p-6 rounded-xl border shadow-sm transition-all ${status === 'active' ? 'bg-white border-blue-100 ring-4 ring-blue-50/50' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-${color}-100 text-${color}-700`}>
                        <Icon size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 leading-tight">{title}</h3>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1 mt-1">
                            <Clock size={12}/> {period}
                        </p>
                    </div>
                </div>
                {status === 'active' && <span className="px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-full animate-pulse">EM EXECUÇÃO</span>}
                {status === 'done' && <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200">CONCLUÍDO</span>}
            </div>
            
            <div className="space-y-4">
                {items.map((item: any, idx: number) => (
                    <div key={idx} className="group">
                        <div className="flex justify-between items-center mb-1">
                            <h4 className={`text-sm font-bold ${item.critical ? 'text-red-700 flex items-center gap-1' : 'text-slate-700'}`}>
                                {item.critical && <AlertTriangle size={12}/>} {item.label}
                            </h4>
                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                                item.status === 'done' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                                item.status === 'doing' ? 'bg-blue-50 text-blue-700 border-blue-100' : 
                                'bg-slate-100 text-slate-400 border-slate-200'
                            }`}>
                                {item.status === 'done' ? 'Feito' : (item.status === 'doing' ? 'Fazendo' : 'Pendente')}
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed pl-2 border-l-2 border-slate-200 group-hover:border-blue-300 transition-colors">
                            {item.desc}
                        </p>
                        {item.impact && (
                            <div className="mt-1 pl-2 text-[10px] font-semibold text-slate-400">
                                Impacto se ignorado: <span className="text-rose-500">{item.impact}</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    </div>
);

export const SystemEvolutionPage: React.FC = () => {
  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <div>
              <h2 className="text-3xl font-extrabold text-slate-800 flex items-center gap-2">
                  <Network className="text-blue-600"/> Plano de Ação: Estabilidade & Produção
              </h2>
              <p className="text-slate-500 mt-1 max-w-2xl">
                  Diagnóstico técnico identificou riscos críticos de perda de dados. Este plano detalha as correções obrigatórias para um ambiente de produção seguro.
              </p>
          </div>
          <div className="bg-rose-50 text-rose-800 px-4 py-3 rounded-lg border border-rose-200 text-sm font-medium flex items-center gap-2">
              <ShieldAlert size={20}/>
              <span>Nível de Risco Atual: <strong>CRÍTICO</strong> (Local Storage)</span>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* COLUNA 1: FASES */}
          <div className="lg:col-span-2 space-y-0">
              
              <PhaseCard 
                title="Fase 1: Resgate & Segurança (Imediato)" 
                period="Semana 1" 
                icon={HardDrive} 
                color="red" 
                status="active"
                items={[
                    {
                        label: "Trava de 'Ilha de Dados'",
                        desc: "Obrigar o download do Backup JSON no momento do Fechamento de Caixa. Mitiga risco de limpeza de cache.",
                        status: 'done',
                        critical: true,
                        impact: "Perda total de dados se limpar cache do navegador."
                    },
                    {
                        label: "Motor de Precisão Financeira",
                        desc: "Implementação de arredondamento bancário forçado (2 casas) para evitar erros de dízima (0.1 + 0.2 != 0.3).",
                        status: 'done',
                        critical: true,
                        impact: "Diferenças de centavos acumuladas invalidam o DRE."
                    },
                    {
                        label: "Alerta de Cota de Armazenamento",
                        desc: "Monitoramento do limite de 5MB do LocalStorage. Avisar usuário antes do sistema travar.",
                        status: 'doing',
                        impact: "Sistema para de salvar novos registros silenciosamente."
                    }
                ]}
              />

              <PhaseCard 
                title="Fase 2: Estabilização & Performance" 
                period="Mês 1" 
                icon={Scale} 
                color="blue" 
                status="pending"
                items={[
                    {
                        label: "Migração para IndexedDB (Dexie.js)",
                        desc: "Substituir LocalStorage (Síncrono/Lento) por IndexedDB (Assíncrono/GBs de espaço). Resolve travamentos com muitos dados.",
                        status: 'pending',
                        critical: true,
                        impact: "Lentidão extrema com >2000 registros."
                    },
                    {
                        label: "Conta Corrente Motorista (Ledger)",
                        desc: "Separar o 'Caixa da Viagem' da 'Dívida do Motorista'. O modelo atual mistura os dois.",
                        status: 'pending',
                        impact: "Impossível rastrear vales e pagamentos parciais."
                    }
                ]}
              />

              <PhaseCard 
                title="Fase 3: Arquitetura Definitiva (Cloud)" 
                period="Mês 2-3" 
                icon={Cloud} 
                color="purple" 
                status="pending"
                items={[
                    {
                        label: "Backend Real (API + Postgres/Firebase)",
                        desc: "Centralizar dados na nuvem. Permitir acesso simultâneo (Dono em casa, Operador na garagem). Fim dos arquivos JSON.",
                        status: 'pending',
                        critical: true,
                        impact: "Erros de sincronia e conflitos de versão."
                    },
                    {
                        label: "Autenticação Real",
                        desc: "Substituir PINs hardcoded por Auth0/Cognito com JWT seguro.",
                        status: 'pending',
                        critical: true,
                        impact: "Qualquer um com acesso à URL pode virar admin."
                    }
                ]}
              />

          </div>

          {/* COLUNA 2: RELATÓRIO DE RISCOS */}
          <div className="lg:col-span-1 space-y-6">
              <div className="bg-white p-6 rounded-xl border-l-4 border-rose-500 shadow-sm">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4 text-lg">
                      <FileWarning size={20} className="text-rose-500"/> Pontos de Falha Atuais
                  </h3>
                  <ul className="space-y-4">
                      <li className="flex gap-3 items-start p-3 bg-rose-50 rounded-lg border border-rose-100">
                          <div className="mt-1 min-w-[20px]"><Database size={16} className="text-rose-600"/></div>
                          <div>
                              <strong className="text-rose-800 text-sm block">Dependência do Browser</strong>
                              <p className="text-xs text-rose-700 leading-tight mt-1">
                                  Se o usuário trocar de navegador ou limpar cookies, <strong>perde tudo</strong>. Não há "nuvem" atualmente.
                              </p>
                          </div>
                      </li>
                      <li className="flex gap-3 items-start p-3 bg-amber-50 rounded-lg border border-amber-100">
                          <div className="mt-1 min-w-[20px]"><LockKeyhole size={16} className="text-amber-600"/></div>
                          <div>
                              <strong className="text-amber-800 text-sm block">Segurança Frágil</strong>
                              <p className="text-xs text-amber-700 leading-tight mt-1">
                                  Qualquer pessoa com acesso físico ao computador logado pode baixar o banco de dados.
                              </p>
                          </div>
                      </li>
                      <li className="flex gap-3 items-start p-3 bg-slate-50 rounded-lg border border-slate-200">
                          <div className="mt-1 min-w-[20px]"><Server size={16} className="text-slate-500"/></div>
                          <div>
                              <strong className="text-slate-800 text-sm block">Sem Acesso Simultâneo</strong>
                              <p className="text-xs text-slate-600 leading-tight mt-1">
                                  Operador e Financeiro não podem trabalhar ao mesmo tempo em computadores diferentes.
                              </p>
                          </div>
                      </li>
                  </ul>
              </div>

              <div className="bg-blue-900 text-white p-6 rounded-xl shadow-lg">
                  <h3 className="font-bold text-lg mb-3">Recomendação do Arquiteto</h3>
                  <p className="text-blue-100 text-sm leading-relaxed mb-4">
                      O sistema atual é um excelente <strong>Protótipo (MVP)</strong>, mas atingiu o limite técnico da arquitetura "Sem Servidor".
                  </p>
                  <p className="text-white font-bold text-sm border-t border-blue-800 pt-4">
                      Próximo passo obrigatório: Iniciar migração para Firebase ou Supabase para garantir a continuidade do negócio.
                  </p>
              </div>
          </div>
      </div>
    </div>
  );
};
