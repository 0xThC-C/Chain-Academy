import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useWebRTC } from '../contexts/WebRTCContext';

interface RouteGuardProps {
  children: React.ReactNode;
}

/**
 * RouteGuard Component
 * 
 * Protege contra navegação não autorizada durante sessões ativas.
 * Intercepta mudanças de rota e solicita confirmação do usuário
 * quando há uma sessão WebRTC ativa.
 */
const RouteGuard: React.FC<RouteGuardProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isInActiveSession, requestLeaveSession, canNavigate } = useWebRTC();

  // Intercepta mudanças de rota via history/back button
  useEffect(() => {
    if (!isInActiveSession) return;

    // Função para interceptar navegação programática
    const handlePopstate = (event: PopStateEvent) => {
      if (!canNavigate()) {
        console.log('🚨 RouteGuard: Blocking navigation via browser back/forward');
        
        // Impede a navegação
        event.preventDefault();
        
        // Força voltar para a rota atual
        window.history.pushState(null, '', location.pathname);
        
        // Solicita confirmação do usuário
        requestLeaveSession(
          () => {
            console.log('✅ RouteGuard: User confirmed navigation via back button');
            // Permitir navegação após confirmação
            navigate(-1);
          },
          () => {
            console.log('❌ RouteGuard: User cancelled navigation via back button');
            // Manter na rota atual
          }
        );
      }
    };

    // Adiciona listener para mudanças no history
    window.addEventListener('popstate', handlePopstate);
    
    // Força um estado no history para interceptar back button
    window.history.pushState(null, '', location.pathname);

    return () => {
      window.removeEventListener('popstate', handlePopstate);
    };
  }, [isInActiveSession, location.pathname, navigate, canNavigate, requestLeaveSession]);

  // Protege contra teclas de atalho do navegador
  useEffect(() => {
    if (!isInActiveSession) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Bloqueia Ctrl+W, Ctrl+T, Ctrl+N, F5, etc.
      if (
        (event.ctrlKey && (event.key === 'w' || event.key === 't' || event.key === 'n')) ||
        event.key === 'F5' ||
        (event.ctrlKey && event.key === 'r')
      ) {
        event.preventDefault();
        
        // Mostra aviso customizado
        const confirmLeave = window.confirm(
          '🚨 ATENÇÃO!\n\n' +
          'Você está tentando fechar ou recarregar a página durante uma sessão ativa.\n\n' +
          'Isso pode:\n' +
          '• Interromper sua chamada\n' +
          '• Causar problemas técnicos\n' +
          '• Prejudicar a experiência do mentor\n\n' +
          'Use o botão "Leave Session" para sair adequadamente.\n\n' +
          'Tem certeza que deseja continuar?'
        );

        if (confirmLeave) {
          console.log('User confirmed closing/refreshing during active session');
          // Permitir ação após confirmação
          window.location.reload();
        } else {
          console.log('User cancelled closing/refreshing during active session');
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isInActiveSession]);

  // Protege contra tentativas de fechar a aba/janela
  useEffect(() => {
    if (!isInActiveSession) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Mostra dialog nativo do navegador
      event.preventDefault();
      event.returnValue = 'Você está em uma sessão ativa. Tem certeza que deseja sair?';
      return 'Você está em uma sessão ativa. Tem certeza que deseja sair?';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isInActiveSession]);

  return <>{children}</>;
};

export default RouteGuard;