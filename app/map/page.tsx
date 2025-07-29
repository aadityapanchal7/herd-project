'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/header';
import { HeroSection } from '@/components/hero-section';
import { ConfigCheck } from '@/components/config-check';
import { ViewSelector } from '@/components/view-selector';
import MapView from '@/components/map-view';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/components/ui/use-toast';
import { deriveSchoolKey } from '@/lib/derive-school';

export default function MapPage() {
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  // 1️⃣ derive schoolKey up here
  const schoolKey = deriveSchoolKey(user?.university);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: 'Authentication Required',
        description: 'You must be logged in to view the map',
        variant: 'destructive',
      });
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router, toast]);

  return (
    <main className="min-h-screen bg-[#f8f7fc]">
      <Header />
      <div className="container px-4 md:px-6 pt-4">
        <ConfigCheck />
      </div>

      {/* Hero above map */}
      <HeroSection
        title={`${user?.university || 'Campus'} Map`}
        subtitle="Explore events happening around your campus. Click on a marker or click “add” to select an event."
      />

      {/* Tabs + MapView now takes schoolKey */}
      <ViewSelector />
      <MapView schoolKey={schoolKey} />
    </main>
  );
}
