'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

export default function ExplorePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  
  // Dummy data to match the design guide
  const [nodes] = useState([
    {
      _id: '1',
      name: 'The Silicon Valley Node',
      description: 'Discuss the latest in tech, startups, and AI. E2E encrypted thoughts.',
      image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=2070&auto=format&fit=crop',
      tags: ['Tech', 'Startups'],
      members: 1240
    },
    {
      _id: '2',
      name: 'Sonic Ripples',
      description: 'Underground music production, sharing stems, and audio engineering.',
      image: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?q=80&w=2070&auto=format&fit=crop',
      tags: ['Music', 'Production'],
      members: 890
    },
    {
      _id: '3',
      name: 'Zen Protocol',
      description: 'Mindfulness in the digital age. Disconnect to connect.',
      image: 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?q=80&w=2070&auto=format&fit=crop',
      tags: ['Privacy', 'Wellness'],
      members: 3200
    },
    {
      _id: '4',
      name: 'Generative Minds',
      description: 'Exploring generative art, LLMs, and the future of creativity.',
      image: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=2074&auto=format&fit=crop',
      tags: ['Art', 'AI'],
      members: 512
    }
  ]);
  
  const [activeFilter, setActiveFilter] = useState('All Nodes');
  const filters = ['All Nodes', 'Tech', 'Music', 'Privacy', 'Art', 'Gaming'];

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
      return;
    }
  }, [user, loading, router]);

  const joinGroup = async (groupId: string) => {
    // Navigate to chat
    router.push(`/talk/${groupId}`);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-primary"><span className="material-symbols-outlined animate-spin text-4xl">blur_on</span></div>;

  const filteredNodes = activeFilter === 'All Nodes' 
    ? nodes 
    : nodes.filter(n => n.tags.includes(activeFilter));

  return (
    <div className="mesh-bg min-h-screen pb-32 font-primary text-text-primary px-6 md:px-12 pt-12">
      <header className="mb-8">
        <h1 className="text-3xl font-display font-bold tracking-tight text-text-primary mb-2">
          Discover Nodes
        </h1>
        <p className="text-text-secondary text-sm max-w-md">
          Join anonymous, encrypted communities based on your interests. Leave no trace.
        </p>
      </header>

      {/* Filter Pills */}
      <div className="flex gap-3 overflow-x-auto pb-4 mb-6 scrollbar-hide">
        {filters.map(filter => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`whitespace-nowrap px-5 py-2 rounded-full text-sm font-semibold transition-all active:scale-95 ${
              activeFilter === filter 
                ? 'bg-primary text-white shadow-md shadow-primary/30' 
                : 'glass-surface text-text-secondary hover:text-primary border-white/50'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Node Cards Grid */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {filteredNodes.map(node => (
          <div key={node._id} className="glass-surface rounded-[24px] overflow-hidden flex flex-col hover:-translate-y-1 transition-transform duration-300 shadow-sm border border-white/60">
            {/* Hero Image */}
            <div className="h-40 w-full relative overflow-hidden bg-white/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={node.image} alt={node.name} className="w-full h-full object-cover opacity-90" />
              <div className="absolute top-3 right-3 bg-white/30 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1 border border-white/30 shadow-sm text-xs font-semibold text-white">
                <span className="material-symbols-outlined text-[14px]">group</span>
                {node.members.toLocaleString()}
              </div>
            </div>
            
            <div className="p-5 flex-1 flex flex-col">
              <h3 className="font-display font-bold text-lg mb-2 text-text-primary">
                {node.name}
              </h3>
              <p className="text-sm text-text-secondary mb-4 flex-1">
                {node.description}
              </p>
              
              <div className="flex flex-wrap gap-2 mb-6">
                {node.tags.map(tag => (
                  <span key={tag} className="bg-primary/10 text-primary text-xs font-semibold px-2.5 py-1 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>

              <button 
                onClick={() => joinGroup(node._id)} 
                className="w-full bg-primary hover:bg-primary-light text-white font-semibold py-3 rounded-xl transition-colors shadow-sm shadow-primary/20"
              >
                Join Node
              </button>
            </div>
          </div>
        ))}
        
        {filteredNodes.length === 0 && (
           <div className="col-span-full py-12 text-center glass-surface rounded-[24px]">
             <span className="material-symbols-outlined text-4xl text-text-muted mb-2">search_off</span>
             <p className="text-text-secondary">No nodes found for this category.</p>
           </div>
        )}
      </div>
    </div>
  );
}
