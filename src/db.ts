import { join } from 'path';

// Define DB directory path (D:\ProjectDouyee\database)
const DB_DIR = join(import.meta.dir, '../database');
const USERS_PATH = join(DB_DIR, 'users.json');
const PRODUCTS_PATH = join(DB_DIR, 'products.json');
const TAXONOMY_PATH = join(DB_DIR, 'taxonomy.json');

// Interface definitions
export interface MultilingualText {
  en: string;
  zh: string;
  th: string; // Dynamic translation support for Thai
}

export interface TextBlock {
  type: 'paragraph';
  content: MultilingualText;
}

export interface SpecTableBlock {
  type: 'specTable';
  headers: { en: string[]; zh: string[]; th: string[] };
  rows: Array<{ en: string[]; zh: string[]; th: string[] }>;
}

export interface BulletListBlock {
  type: 'bulletList';
  items: MultilingualText[];
}

export type ContentBlock = TextBlock | SpecTableBlock | BulletListBlock;

export interface GroupMatrixItem {
  type: 'group';
  title: MultilingualText;
}

export interface StandardMatrixItem {
  type: 'standard';
  key: MultilingualText;
  value: MultilingualText;
}

export interface NestedMatrixItem {
  type: 'nested';
  parentKey: MultilingualText;
  subProperties: Array<{
    key: MultilingualText;
    value: MultilingualText;
  }>;
}

export type MatrixItem = GroupMatrixItem | StandardMatrixItem | NestedMatrixItem;

export interface ProductVariant {
  sku: string;
  name: MultilingualText;
  specs: string;
}

export interface StructuredDownload {
  url: string;
  title: MultilingualText;
  type: string; // 'manual', 'datasheet', 'certificate', 'other'
}

export interface Product {
  id: string;
  title: MultilingualText;
  sku: string;
  department: string; // Dynamic sector ID or sector English name
  subCategory: MultilingualText;
  status: 'enabled' | 'disabled';
  publishAt?: string; // ISO string
  expireAt?: string; // ISO string
  imagePaths: string[];
  pdfPaths: string[];
  contentBlocks: ContentBlock[];
  technicalMatrix: MatrixItem[];
  createdAt: string;
  brand?: string;
  variants?: ProductVariant[];
  downloads?: StructuredDownload[];
  videoUrls?: string[];
  certifications?: string[];
}

export interface User {
  id: string;
  email: string;
  passwordHash: string;
}

// Taxonomy database interfaces
export interface TaxonomySubCategory {
  id: string;
  name: MultilingualText;
}

export interface TaxonomySector {
  id: string;
  name: MultilingualText;
  subCategories: TaxonomySubCategory[];
}

const defaultTaxonomy: TaxonomySector[] = [
  {
    id: "sector-smt",
    name: { en: "SMT Equipment", zh: "SMT设备", th: "อุปกรณ์ SMT" },
    subCategories: [
      { id: "sub-smt-1", name: { en: "Dispensers", zh: "点胶机", th: "เครื่องหยอดกาว" } },
      { id: "sub-smt-2", name: { en: "Tabletop Robots", zh: "桌面型机器人", th: "หุ่นยนต์ตั้งโต๊ะ" } }
    ]
  },
  {
    id: "sector-esd",
    name: { en: "Static Control", zh: "静电防护", th: "การควบคุมไฟฟ้าสถิต" },
    subCategories: [
      { id: "sub-esd-1", name: { en: "Ionizers", zh: "离子消电器", th: "เครื่องกำจัดไฟฟ้าสถิต" } },
      { id: "sub-esd-2", name: { en: "Shielding Bags", zh: "屏蔽袋", th: "ถุงป้องกันไฟฟ้าสถิต" } }
    ]
  },
  {
    id: "sector-cleanroom",
    name: { en: "Cleanroom Consumables", zh: "洁净室微污染控制", th: "อุปกรณ์ห้องคลีนรูม" },
    subCategories: [
      { id: "sub-cleanroom-1", name: { en: "Wipers", zh: "无尘擦拭纸", th: "กระดาษเช็ดห้องคลีนรูม" } },
      { id: "sub-cleanroom-2", name: { en: "Gloves", zh: "手套", th: "ถุงมือ" } }
    ]
  },
  {
    id: "sector-packaging",
    name: { en: "Packaging", zh: "半导体包装材料", th: "บรรจุภัณฑ์สารกึ่งตัวนำ" },
    subCategories: [
      { id: "sub-pack-1", name: { en: "Carrier Tapes", zh: "载带", th: "เทปนำพา" } },
      { id: "sub-pack-2", name: { en: "Reels", zh: "卷盘", th: "ม้วนเทป" } }
    ]
  }
];

// Ensure database folders exist
export async function initDb() {
  const fs = require('fs/promises');
  try {
    await fs.mkdir(DB_DIR, { recursive: true });
  } catch (e) {
    // Ignore error
  }

  // Init users
  try {
    await fs.access(USERS_PATH);
  } catch (e) {
    const defaultHash = await Bun.password.hash('password123');
    const defaultAdmin: User = {
      id: 'admin-1',
      email: 'admin@douyee.com',
      passwordHash: defaultHash
    };
    await fs.writeFile(USERS_PATH, JSON.stringify([defaultAdmin], null, 2));
    console.log('Database: Initialized default administrator accounts');
  }

  // Init products
  try {
    await fs.access(PRODUCTS_PATH);
  } catch (e) {
    await fs.writeFile(PRODUCTS_PATH, JSON.stringify([], null, 2));
    console.log('Database: Initialized empty products catalog');
  }

  // Init taxonomy
  try {
    await fs.access(TAXONOMY_PATH);
  } catch (e) {
    await fs.writeFile(TAXONOMY_PATH, JSON.stringify(defaultTaxonomy, null, 2));
    console.log('Database: Initialized default categories taxonomy');
  }
}

// Helpers for reading/writing users
export async function getUsers(): Promise<User[]> {
  const fs = require('fs/promises');
  try {
    const data = await fs.readFile(USERS_PATH, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

export async function saveUsers(users: User[]): Promise<void> {
  const fs = require('fs/promises');
  await fs.writeFile(USERS_PATH, JSON.stringify(users, null, 2));
}

// Helpers for reading/writing products
export async function getProducts(): Promise<Product[]> {
  const fs = require('fs/promises');
  try {
    const data = await fs.readFile(PRODUCTS_PATH, 'utf8');
    const products = JSON.parse(data);
    // Ensure all products have 'th' fields
    return products.map((p: any) => {
      const title = { en: p.title?.en || '', zh: p.title?.zh || '', th: p.title?.th || p.title?.en || '' };
      const subCategory = { en: p.subCategory?.en || '', zh: p.subCategory?.zh || '', th: p.subCategory?.th || p.subCategory?.en || '' };
      return {
        ...p,
        title,
        subCategory
      };
    });
  } catch (e) {
    return [];
  }
}

export async function saveProducts(products: Product[]): Promise<void> {
  const fs = require('fs/promises');
  await fs.writeFile(PRODUCTS_PATH, JSON.stringify(products, null, 2));
}

// Helpers for reading/writing taxonomy categories
export async function getTaxonomy(): Promise<TaxonomySector[]> {
  const fs = require('fs/promises');
  try {
    const data = await fs.readFile(TAXONOMY_PATH, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    return defaultTaxonomy;
  }
}

export async function saveTaxonomy(taxonomy: TaxonomySector[]): Promise<void> {
  const fs = require('fs/promises');
  await fs.writeFile(TAXONOMY_PATH, JSON.stringify(taxonomy, null, 2));
}
