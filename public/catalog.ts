import { useEffect, useState } from 'react';

export interface ML {
  en: string;
  zh: string;
  th: string;
}

export interface CatalogProduct {
  id: string;
  title: ML;
  sku: string;
  department: string;
  subCategory: ML;
  imagePaths: string[];
  pdfPaths?: string[];
  downloads?: { url: string; title: ML; type: string }[];
}

export interface CatalogSector {
  id: string;
  name: ML;
  subCategories: { id: string; name: ML }[];
}

// Shared fetch so header, menu and pages load the catalog only once
let cache: Promise<{ products: CatalogProduct[]; sectors: CatalogSector[] }> | null = null;

function loadCatalog() {
  if (!cache) {
    cache = Promise.all([
      fetch('/api/products').then((r) => (r.ok ? r.json() : [])),
      fetch('/api/taxonomy').then((r) => (r.ok ? r.json() : []))
    ])
      .then(([products, sectors]) => ({ products, sectors }))
      .catch(() => {
        cache = null;
        return { products: [], sectors: [] };
      });
  }
  return cache;
}

export function useCatalog() {
  const [data, setData] = useState<{ products: CatalogProduct[]; sectors: CatalogSector[] }>({ products: [], sectors: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    loadCatalog().then((d) => {
      if (alive) {
        setData(d);
        setLoading(false);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  return { ...data, loading };
}

// Products store the sector id, older records may store the English sector name
export function inSector(product: CatalogProduct, sector: CatalogSector) {
  const dept = (product.department || '').toLowerCase();
  return dept === sector.id.toLowerCase() || dept === sector.name.en.toLowerCase();
}

export function initials(text: string) {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 3)
    .toUpperCase();
}

// Short list shown in the footer
export const CATALOGUES = [
  'Micro Contamination Control@ Cleanroom',
  'Cleaning Disinfection & Protection Catalogue',
  'Advance Assembly Technology',
  'Semiconductor Tool & Material Technology'
];

// Full list for the Catalogues page; covers live in public/assets
export const CATALOGUE_COVERS = [
  { title: 'Micro Contamination Control @ Cleanroom', cover: '/assets/cat-1.jpg' },
  { title: 'Cleaning Disinfection & Protection Catalogue', cover: '/assets/cat-2.jpg' },
  { title: 'Advanced Assembly Technology', cover: '/assets/cat-3.jpg' },
  { title: 'Semiconductor Tools & Material Technology', cover: '/assets/cat-4.jpg' },
  { title: 'SIMCO ION', cover: '/assets/cat-5.jpg' },
  { title: 'Electrostatic Discharge Control', cover: '/assets/cat-6.jpg' },
  { title: 'Equipment & Accessories', cover: '/assets/cat-7.jpg' },
  { title: 'Bonding Capillary', cover: '/assets/cat-8.jpg' },
  { title: 'Wafer Group', cover: '/assets/cat-9.jpg' },
  { title: 'RBS Concentrated Surfactant', cover: '/assets/cat-10.jpg' }
];

// Series artwork matched by sector name; other sectors fall back to initials
export function badgeImage(sector: CatalogSector): string | null {
  const name = sector.name.en.toLowerCase();
  if (/\besd\b/.test(name)) return '/assets/badge-esd.png';
  if (/\be9\b/.test(name)) return '/assets/badge-e9.png';
  return null;
}
