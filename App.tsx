import React, { useState, useEffect } from 'react';
import MobileEntry from './components/MobileEntry';
import Dashboard from './components/Dashboard';
import LandingPage from './components/LandingPage';
import { AppSettings, DEFAULT_APP_SETTINGS, Language, Product } from './types';
import { dbService } from './services/db';

type ViewState = 'landing' | 'sourcing' | 'dashboard';

const sameJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export default function App() {
  const [currentView, setCurrentView] = useState<ViewState>('landing');
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);

  // Load from IndexedDB on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [storedProducts, storedSettings] = await Promise.all([
          dbService.getAll(),
          dbService.getSettings()
        ]);
        // Sort by newest first
        setProducts(storedProducts.sort((a, b) => b.timestamp - a.timestamp));
        setSettings(storedSettings);
      } catch (error) {
        console.error("Failed to load data from DB:", error);
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
      setProducts(prev => prev.filter(product => product.id !== newProduct.id || !sameJson(product, newProduct)));
      console.error("Failed to save product:", error);
      alert("Error saving data. Please check storage space.");
    }
  };

  const handleUpdateProduct = async (updatedProduct: Product) => {
    const previousProduct = products.find(product => product.id === updatedProduct.id);
    setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
    try {
      await dbService.save(updatedProduct);
    } catch (error) {
      if (previousProduct) {
        setProducts(prev => prev.map(product =>
          product.id === updatedProduct.id && sameJson(product, updatedProduct) ? previousProduct : product
        ));
      }
      console.error("Failed to update product:", error);
      alert("Error updating data. Please check storage space.");
    }
  };
  
  const handleDeleteProducts = async (ids: string[]) => {
    const deletedProducts = products.filter(product => ids.includes(product.id));
    setProducts(prev => prev.filter(p => !ids.includes(p.id)));
    try {
      await dbService.deleteMany(ids);
    } catch (error) {
      setProducts(prev => [
        ...deletedProducts.filter(deletedProduct => !prev.some(product => product.id === deletedProduct.id)),
        ...prev
      ].sort((a, b) => b.timestamp - a.timestamp));
      console.error("Failed to delete products:", error);
      alert("Error deleting data. Please check storage space.");
    }
  };

  const handleSettingsChange = async (nextSettings: AppSettings) => {
    const previousSettings = settings;
    setSettings(nextSettings);
    try {
      await dbService.saveSettings(nextSettings);
    } catch (error) {
      setSettings(current => sameJson(current, nextSettings) ? previousSettings : current);
      console.error("Failed to save settings:", error);
      alert("Error saving settings. Please check storage space.");
    }
  };

  const handleLanguageChange = (language: Language) => {
    handleSettingsChange({ ...settings, language });
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
            currentLang={settings.language}
            onLanguageChange={handleLanguageChange}
          />
        )}

        {currentView === 'sourcing' && (
          <div className="h-full w-full bg-slate-50">
             <MobileEntry 
               onSave={handleAddProduct} 
               products={products}
               onUpdateProduct={handleUpdateProduct}
               onDeleteProduct={handleDeleteProducts}
               settings={settings}
               onSettingsChange={handleSettingsChange}
               currentLang={settings.language}
               onLanguageChange={handleLanguageChange}
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
              settings={settings}
              onSettingsChange={handleSettingsChange}
              currentLang={settings.language}
              onLanguageChange={handleLanguageChange}
              onHome={() => setCurrentView('landing')}
            />
          </div>
        )}
      </div>
    </div>
  );
}
