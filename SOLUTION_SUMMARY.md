# Solução para o Problema de Expansão dos ProfileCards

## Problema Identificado
Todos os 3 ProfileCards expandiam visualmente ao clicar na seta de um deles, mas apenas o clicado mostrava o conteúdo.

## Causa Raiz
A função `toggleProfileExpansion` estava sendo recriada a cada render do componente ReviewsPage, causando re-renders desnecessários de todos os ProfileCards, mesmo com React.memo.

## Solução Implementada

### 1. Importação do useCallback
```tsx
import React, { useState, useMemo, useCallback } from 'react';
```

### 2. Memoização da função toggleProfileExpansion
```tsx
const toggleProfileExpansion = useCallback((userAddress: string) => {
  setExpandedProfiles(prev => {
    const newSet = new Set(prev);
    if (newSet.has(userAddress.toLowerCase())) {
      newSet.delete(userAddress.toLowerCase());
    } else {
      newSet.add(userAddress.toLowerCase());
    }
    return newSet;
  });
}, []);
```

### 3. Comparador customizado para React.memo
```tsx
}, (prevProps, nextProps) => {
  // Custom comparator to ensure React.memo works correctly
  return (
    prevProps.userAddress === nextProps.userAddress &&
    prevProps.userRole === nextProps.userRole &&
    prevProps.isExpanded === nextProps.isExpanded &&
    prevProps.showRecentOnly === nextProps.showRecentOnly &&
    prevProps.maxRecentReviews === nextProps.maxRecentReviews
    // Note: We intentionally don't compare onToggleExpanded as it should be memoized
  );
});
```

## Arquivos Modificados
- `/home/mathewsl/Chain Academy V2/frontend/src/pages/ReviewsPage.tsx`
- `/home/mathewsl/Chain Academy V2/frontend/src/components/ProfileCard.tsx`

## Resultado Esperado
Agora apenas o ProfileCard clicado deve expandir tanto visualmente quanto funcionalmente, garantindo que:
1. O estado `expandedProfiles` controle corretamente qual card está expandido
2. React.memo previna re-renders desnecessários
3. A função `toggleProfileExpansion` não seja recriada a cada render