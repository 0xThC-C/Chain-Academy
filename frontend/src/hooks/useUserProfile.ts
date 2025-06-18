import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';

export interface UserProfile {
  displayName: string;
  bio: string;
  skills: string;
  experienceLevel: string;
  profileImage: string;
  address?: string;
  updatedAt?: string;
  createdAt?: string;
}

const defaultProfile: UserProfile = {
  displayName: '',
  bio: '',
  skills: '',
  experienceLevel: '',
  profileImage: ''
};

/**
 * Hook para gerenciar perfil de usuário baseado no endereço da carteira
 * Automaticamente carrega/salva dados quando a carteira conecta/desconecta
 */
export const useUserProfile = () => {
  const { address, isConnected } = useAccount();
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [isLoading, setIsLoading] = useState(false);
  const [lastLoadedAddress, setLastLoadedAddress] = useState<string | null>(null);

  /**
   * Carrega perfil do localStorage baseado no endereço
   */
  const loadProfile = useCallback(async (walletAddress: string) => {
    try {
      setIsLoading(true);
      console.log(`👤 Loading profile for address: ${walletAddress}`);
      
      const savedProfile = localStorage.getItem(`profile_${walletAddress.toLowerCase()}`);
      
      if (savedProfile) {
        const parsedProfile = JSON.parse(savedProfile);
        setProfile(parsedProfile);
        console.log(`✅ Profile loaded for ${walletAddress}:`, parsedProfile);
      } else {
        // Endereço novo - usar perfil padrão
        const newProfile = { ...defaultProfile };
        setProfile(newProfile);
        console.log(`📝 New address detected: ${walletAddress}, using default profile`);
      }
      
      setLastLoadedAddress(walletAddress);
    } catch (error) {
      console.error('❌ Error loading profile:', error);
      setProfile(defaultProfile);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Salva perfil no localStorage
   */
  const saveProfile = useCallback(async (profileData: Partial<UserProfile>) => {
    if (!address) {
      throw new Error('No wallet address available');
    }

    try {
      setIsLoading(true);
      console.log(`💾 Saving profile for address: ${address}`);

      const updatedProfile: UserProfile = {
        ...profile,
        ...profileData,
        address: address.toLowerCase(),
        updatedAt: new Date().toISOString(),
        createdAt: profile.createdAt || new Date().toISOString()
      };

      localStorage.setItem(
        `profile_${address.toLowerCase()}`, 
        JSON.stringify(updatedProfile)
      );

      setProfile(updatedProfile);
      console.log(`✅ Profile saved for ${address}:`, updatedProfile);
      
      return updatedProfile;
    } catch (error) {
      console.error('❌ Error saving profile:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [address, profile]);

  /**
   * Atualiza campos específicos do perfil
   */
  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    setProfile(prev => ({
      ...prev,
      ...updates
    }));
  }, []);

  /**
   * Limpa dados do perfil
   */
  const clearProfile = useCallback(() => {
    console.log('🧹 Clearing profile data');
    setProfile(defaultProfile);
    setLastLoadedAddress(null);
  }, []);

  /**
   * Verifica se há dados salvos para um endereço
   */
  const hasProfileData = useCallback((walletAddress?: string) => {
    const addressToCheck = walletAddress || address;
    if (!addressToCheck) return false;
    
    const savedProfile = localStorage.getItem(`profile_${addressToCheck.toLowerCase()}`);
    return !!savedProfile;
  }, [address]);

  /**
   * Lista todos os perfis salvos
   */
  const getAllProfiles = useCallback(() => {
    const profiles: Array<UserProfile & { address: string }> = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('profile_')) {
        try {
          const profileData = JSON.parse(localStorage.getItem(key) || '');
          profiles.push({
            ...profileData,
            address: key.replace('profile_', '')
          });
        } catch (error) {
          console.error(`Error parsing profile ${key}:`, error);
          // Remove corrupted profile
          localStorage.removeItem(key);
        }
      }
    }
    
    return profiles.sort((a, b) => 
      (new Date(b.updatedAt || 0).getTime()) - (new Date(a.updatedAt || 0).getTime())
    );
  }, []);

  /**
   * Diagnóstico geral do sistema de perfis
   */
  const diagnoseProfiles = useCallback(() => {
    console.log('🔍 === PROFILE SYSTEM DIAGNOSIS ===');
    
    const allProfiles = getAllProfiles();
    console.log(`📊 Total profiles found: ${allProfiles.length}`);
    
    allProfiles.forEach((profile, index) => {
      console.log(`${index + 1}. Address: ${profile.address}`);
      console.log(`   Name: ${profile.displayName || 'EMPTY'}`);
      console.log(`   Bio: ${profile.bio ? profile.bio.substring(0, 50) + '...' : 'EMPTY'}`);
      console.log(`   Skills: ${profile.skills || 'EMPTY'}`);
      console.log(`   Experience: ${profile.experienceLevel || 'EMPTY'}`);
      console.log(`   Image: ${profile.profileImage ? 'YES' : 'NO'}`);
      console.log(`   Updated: ${profile.updatedAt || 'NEVER'}`);
      console.log('   ---');
    });
    
    // Check mentorships
    const mentorships = JSON.parse(localStorage.getItem('global_mentorships') || '[]');
    console.log(`📋 Total mentorships: ${mentorships.length}`);
    
    mentorships.forEach((mentorship: any, index: number) => {
      console.log(`${index + 1}. Mentorship ID: ${mentorship.id}`);
      console.log(`   Address: ${mentorship.mentorAddress}`);
      console.log(`   Saved Name: ${mentorship.mentorName || 'EMPTY'}`);
      console.log(`   Saved Bio: ${mentorship.mentorBio || 'EMPTY'}`);
      console.log('   ---');
    });
    
    console.log('🔍 === END DIAGNOSIS ===');
    
    return { profiles: allProfiles, mentorships };
  }, [getAllProfiles]);

  // Carrega perfil automaticamente quando endereço muda
  useEffect(() => {
    if (isConnected && address && address !== lastLoadedAddress) {
      console.log(`🔄 Address changed from ${lastLoadedAddress} to ${address}`);
      
      // Verificar se há dados corrompidos e tentar recuperar
      const checkAndRepairProfile = () => {
        const savedProfile = localStorage.getItem(`profile_${address.toLowerCase()}`);
        if (savedProfile) {
          try {
            const profile = JSON.parse(savedProfile);
            console.log(`✅ Profile found for ${address}:`, {
              displayName: profile.displayName || 'EMPTY',
              bio: profile.bio ? profile.bio.substring(0, 30) + '...' : 'EMPTY',
              skills: profile.skills || 'EMPTY',
              experienceLevel: profile.experienceLevel || 'EMPTY',
              hasImage: !!profile.profileImage
            });
          } catch (error) {
            console.error(`❌ Profile corrupted for ${address}, clearing:`, error);
            localStorage.removeItem(`profile_${address.toLowerCase()}`);
          }
        } else {
          console.log(`📝 No profile found for ${address}`);
        }
      };
      
      checkAndRepairProfile();
      loadProfile(address);
    } else if (!isConnected) {
      console.log('🔌 Wallet disconnected, clearing profile');
      clearProfile();
    }
  }, [address, isConnected, lastLoadedAddress, loadProfile, clearProfile]);

  // Debug log para mudanças no perfil
  useEffect(() => {
    if (address && (profile.displayName || profile.bio || profile.skills)) {
      console.log(`👤 Profile state for ${address}:`, {
        displayName: profile.displayName,
        bio: profile.bio ? profile.bio.substring(0, 50) + '...' : '',
        skills: profile.skills,
        experienceLevel: profile.experienceLevel,
        hasImage: !!profile.profileImage,
        updatedAt: profile.updatedAt
      });
    }
  }, [address, profile]);

  return {
    // Estado
    profile,
    isLoading,
    isConnected,
    address,
    lastLoadedAddress,
    
    // Ações
    saveProfile,
    updateProfile,
    loadProfile,
    clearProfile,
    
    // Utilitários
    hasProfileData,
    getAllProfiles,
    diagnoseProfiles,
    
    // Computed
    hasUnsavedChanges: profile.address !== address?.toLowerCase(),
    isProfileComplete: !!(profile.displayName && profile.bio && profile.skills && profile.experienceLevel)
  };
};