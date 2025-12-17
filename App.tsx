import React, { useState, useEffect } from 'react';
import MobileEntry from './components/MobileEntry';
import Dashboard from './components/Dashboard';
import LandingPage from './components/LandingPage';
import { Product, Language } from './types';
import { dbService } from './services/db';

type ViewState = 'landing' | 'sourcing' | 'dashboard';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewState>('landing');
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [language, setLanguage] = useState<Language>('en');

  // Load from IndexedDB on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const storedProducts = await dbService.getAll();
        // Sort by newest first
        setProducts(storedProducts.sort((a, b) => b.timestamp - a.timestamp));
      } catch (error) {
        console.error("Failed to load products from DB:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const handleAddProduct = async (newProduct: Product) => {
    // Optimistic UI update
    setProducts(prev => [newProduct, ...prev]);
    // Persist to DB
    try {
      await dbService.save(newProduct);
    } catch (error) {
      console.error("Failed to save product:", error);
      alert("Error saving data. Please check storage space.");
    }
  };

  const handleUpdateProduct = async (updatedProduct: Product) => {
    setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
    try {
      await dbService.save(updatedProduct);
    } catch (error) {
      console.error("Failed to update product:", error);
    }
  };
  
  const handleDeleteProducts = async (ids: string[]) => {
    setProducts(prev => prev.filter(p => !ids.includes(p.id)));
    try {
      await dbService.deleteMany(ids);
    } catch (error) {
      console.error("Failed to delete products:", error);
    }
  };

  if (isLoading) {
    return (
       <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
          <div className="animate-pulse flex flex-col items-center">
             <div className="w-12 h-12 bg-indigo-100 rounded-full mb-3"></div>
             <div className="h-4 w-32 bg-slate-200 rounded"></div>
          </div>
       </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden text-slate-900 bg-slate-100">
      <div className="flex-1 overflow-hidden relative">
        {currentView === 'landing' && (
          <LandingPage 
            onNavigate={(view) => setCurrentView(view)} 
            currentLang={language}
            onLanguageChange={setLanguage}
          />
        )}

        {currentView === 'sourcing' && (
          <div className="h-full w-full bg-slate-50">
             <MobileEntry 
               onSave={handleAddProduct} 
               products={products}
               onUpdateProduct={handleUpdateProduct}
               onDeleteProduct={handleDeleteProducts}
               currentLang={language}
               onLanguageChange={setLanguage}
               onClose={() => setCurrentView('landing')}
             />
          </div>
        )}

        {currentView === 'dashboard' && (
          <div className="h-full w-full bg-slate-50 flex flex-col">
            <Dashboard 
              products={products} 
              onUpdateProduct={handleUpdateProduct} 
              onDeleteProduct={handleDeleteProducts}
              onAddProduct={handleAddProduct}
              currentLang={language}
              onLanguageChange={setLanguage}
              onHome={() => setCurrentView('landing')}
            />
          </div>
        )}
      </div>
    </div>
  );
}