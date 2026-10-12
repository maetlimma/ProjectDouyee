import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useI18n } from '../i18n';
import { 
  ArrowLeft, Trash2, ArrowUp, ArrowDown, 
  Layers, Upload, FileText, Layout, Eye, Save, X 
} from 'lucide-react';

// Interface definitions
interface MultilingualText {
  en: string;
  zh: string;
  th: string;
}

interface TextBlock {
  type: 'paragraph';
  content: MultilingualText;
}

interface SpecTableBlock {
  type: 'specTable';
  headers: { en: string[]; zh: string[]; th: string[] };
  rows: Array<{ en: string[]; zh: string[]; th: string[] }>;
}

interface BulletListBlock {
  type: 'bulletList';
  items: MultilingualText[];
}

type ContentBlock = TextBlock | SpecTableBlock | BulletListBlock;

interface ProductVariant {
  sku: string;
  name: MultilingualText;
  specs: string;
}

interface StructuredDownload {
  url: string;
  title: MultilingualText;
  type: string;
}

interface GroupMatrixItem {
  type: 'group';
  title: MultilingualText;
}

interface StandardMatrixItem {
  type: 'standard';
  key: MultilingualText;
  value: MultilingualText;
}

interface NestedMatrixItem {
  type: 'nested';
  parentKey: MultilingualText;
  subProperties: Array<{
    key: MultilingualText;
    value: MultilingualText;
  }>;
}

type MatrixItem = GroupMatrixItem | StandardMatrixItem | NestedMatrixItem;

interface TaxonomySubCategory {
  id: string;
  name: MultilingualText;
}

interface TaxonomySector {
  id: string;
  name: MultilingualText;
  subCategories: TaxonomySubCategory[];
}

const AdminWorkspaceView: React.FC = () => {
  const { lang } = useI18n();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('id');

  // Form State
  const [title, setTitle] = useState<MultilingualText>({ en: '', zh: '', th: '' });
  const [sku, setSku] = useState('');
  const [brand, setBrand] = useState('');
  const [department, setDepartment] = useState(''); // Sector English name (e.g. 'Static Control')
  const [subCategory, setSubCategory] = useState<MultilingualText>({ en: '', zh: '', th: '' });
  
  // Visibility State
  const [status, setStatus] = useState<'enabled' | 'disabled'>('enabled');
  const [publishAt, setPublishAt] = useState('');
  const [expireAt, setExpireAt] = useState('');

  // Media List State
  const [imagePaths, setImagePaths] = useState<string[]>([]);
  const [pdfPaths, setPdfPaths] = useState<string[]>([]);
  const [downloads, setDownloads] = useState<StructuredDownload[]>([]);
  const [videoUrls, setVideoUrls] = useState<string[]>([]);
  const [certifications, setCertifications] = useState<string[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);

  // Editor Blocks State
  const [contentBlocks, setContentBlocks] = useState<ContentBlock[]>([]);
  const [technicalMatrix, setTechnicalMatrix] = useState<MatrixItem[]>([]);

  // UI States
  const [otherProducts, setOtherProducts] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  
  // Taxonomy State
  const [taxonomy, setTaxonomy] = useState<TaxonomySector[]>([]);
  const [activeSubCategories, setActiveSubCategories] = useState<TaxonomySubCategory[]>([]);
  
  // Active translation tab in editor fields ('en' | 'zh' | 'th')
  const [editLang, setEditLang] = useState<'en' | 'zh' | 'th'>('en');

  const getHeaders = () => {
    const token = localStorage.getItem('douyee_admin_token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  // Load taxonomy config, ledger, and product data
  useEffect(() => {
    const token = localStorage.getItem('douyee_admin_token');
    if (!token) {
      navigate('/login');
      return;
    }

    const loadWorkspaceData = async () => {
      try {
        // Fetch Taxonomy Categories
        const taxRes = await fetch('/api/taxonomy');
        let loadedTaxonomy: TaxonomySector[] = [];
        if (taxRes.ok) {
          loadedTaxonomy = await taxRes.json();
          setTaxonomy(loadedTaxonomy);
        }

        // Fetch products list for sidebar
        const listRes = await fetch('/api/admin/products', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (listRes.status === 401) {
          localStorage.removeItem('douyee_admin_token');
          navigate('/login');
          return;
        }
        if (listRes.ok) {
          const listData = await listRes.json();
          setOtherProducts(listData.filter((p: any) => p.id !== editId));
        }

        // If in edit mode, fetch the specific product details
        if (editId) {
          const detailRes = await fetch(`/api/admin/products/${editId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (detailRes.ok) {
            const product = await detailRes.json();
            setTitle({
              en: product.title?.en || '',
              zh: product.title?.zh || '',
              th: product.title?.th || ''
            });
            setSku(product.sku || '');
            setDepartment(product.department || '');
            setSubCategory({
              en: product.subCategory?.en || '',
              zh: product.subCategory?.zh || '',
              th: product.subCategory?.th || ''
            });
            setStatus(product.status || 'enabled');
            setPublishAt(product.publishAt ? product.publishAt.substring(0, 16) : '');
            setExpireAt(product.expireAt ? product.expireAt.substring(0, 16) : '');
            setImagePaths(product.imagePaths || []);
            setPdfPaths(product.pdfPaths || []);
            setBrand(product.brand || '');
            setContentBlocks(product.contentBlocks || []);
            setTechnicalMatrix(product.technicalMatrix || []);
            setVariants(product.variants || []);
            setDownloads(product.downloads || []);
            setVideoUrls(product.videoUrls || []);
            setCertifications(product.certifications || []);

            // Populate child subcategories based on loaded department sector
            if (product.department) {
              const matchedSector = loadedTaxonomy.find(
                s => s.name.en.toLowerCase() === product.department.toLowerCase() || s.id === product.department
              );
              if (matchedSector) {
                setActiveSubCategories(matchedSector.subCategories);
              }
            }
          }
        } else {
          // If creating new, default to first taxonomy sector
          if (loadedTaxonomy.length > 0) {
            setDepartment(loadedTaxonomy[0].name.en);
            setActiveSubCategories(loadedTaxonomy[0].subCategories);
            setBrand('');
            if (loadedTaxonomy[0].subCategories.length > 0) {
              setSubCategory(loadedTaxonomy[0].subCategories[0].name);
            }
          }
        }
      } catch (e: any) {
        console.error(e.message);
      }
    };

    loadWorkspaceData();
  }, [editId, navigate]);

  // Handle primary sector category change
  const handleSectorChange = (sectorEnName: string) => {
    setDepartment(sectorEnName);
    const matchedSector = taxonomy.find(s => s.name.en === sectorEnName);
    if (matchedSector) {
      setActiveSubCategories(matchedSector.subCategories);
      if (matchedSector.subCategories.length > 0) {
        setSubCategory(matchedSector.subCategories[0].name);
      } else {
        setSubCategory({ en: '', zh: '', th: '' });
      }
    } else {
      setActiveSubCategories([]);
      setSubCategory({ en: '', zh: '', th: '' });
    }
  };

  // Handle child subcategory change
  const handleSubCategoryChange = (subCategoryEnName: string) => {
    const matchedSub = activeSubCategories.find(sub => sub.name.en === subCategoryEnName);
    if (matchedSub) {
      setSubCategory(matchedSub.name);
    }
  };

  // File Upload Handlers
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'pdf') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const token = localStorage.getItem('douyee_admin_token');
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        if (type === 'image') {
          setImagePaths(prev => [...prev, ...data.paths]);
        } else {
          setPdfPaths(prev => [...prev, ...data.paths]);
        }
      } else {
        alert('File upload failed.');
      }
    } catch (err) {
      console.error(err);
      alert('Error uploading file.');
    }
  };

  // Complex Hardware Builder Helpers
  const addVariant = () => setVariants(prev => [...prev, { sku: '', name: { en: '', zh: '', th: '' }, specs: '' }]);
  const updateVariant = (idx: number, field: string, val: string) => setVariants(prev => {
    const copy = [...prev];
    if (field === 'sku') copy[idx].sku = val;
    else if (field === 'name') copy[idx].name[editLang] = val;
    else if (field === 'specs') copy[idx].specs = val;
    return copy;
  });
  const removeVariant = (idx: number) => setVariants(prev => prev.filter((_, i) => i !== idx));

  const addDownload = () => setDownloads(prev => [...prev, { url: '', title: { en: '', zh: '', th: '' }, type: 'manual' }]);
  const updateDownload = (idx: number, field: string, val: string) => setDownloads(prev => {
    const copy = [...prev];
    if (field === 'url') copy[idx].url = val;
    else if (field === 'title') copy[idx].title[editLang] = val;
    else if (field === 'type') copy[idx].type = val;
    return copy;
  });
  const removeDownload = (idx: number) => setDownloads(prev => prev.filter((_, i) => i !== idx));

  const addVideoUrl = () => setVideoUrls(prev => [...prev, '']);
  const updateVideoUrl = (idx: number, val: string) => setVideoUrls(prev => {
    const copy = [...prev];
    copy[idx] = val;
    return copy;
  });
  const removeVideoUrl = (idx: number) => setVideoUrls(prev => prev.filter((_, i) => i !== idx));

  const addCertification = () => setCertifications(prev => [...prev, '']);
  const updateCertification = (idx: number, val: string) => setCertifications(prev => {
    const copy = [...prev];
    copy[idx] = val;
    return copy;
  });
  const removeCertification = (idx: number) => setCertifications(prev => prev.filter((_, i) => i !== idx));

  // Block Builder Helpers
  const addParagraphBlock = () => {
    const newBlock: TextBlock = {
      type: 'paragraph',
      content: { en: '', zh: '', th: '' }
    };
    setContentBlocks(prev => [...prev, newBlock]);
  };

  const addBulletListBlock = () => {
    const newBlock: BulletListBlock = {
      type: 'bulletList',
      items: [{ en: 'New Feature', zh: '新特点', th: 'คุณลักษณะใหม่' }]
    };
    setContentBlocks(prev => [...prev, newBlock]);
  };

  const updateBulletListItem = (bIdx: number, iIdx: number, val: string) => {
    setContentBlocks(prev => {
      const copy = [...prev];
      if (copy[bIdx].type === 'bulletList') {
        const block = copy[bIdx] as BulletListBlock;
        block.items[iIdx][editLang] = val;
      }
      return copy;
    });
  };

  const addBulletListItem = (bIdx: number) => {
    setContentBlocks(prev => {
      const copy = [...prev];
      if (copy[bIdx].type === 'bulletList') {
        const block = copy[bIdx] as BulletListBlock;
        block.items.push({ en: 'Additional Feature', zh: '附加功能', th: 'คุณลักษณะเพิ่มเติม' });
      }
      return copy;
    });
  };

  const removeBulletListItem = (bIdx: number, iIdx: number) => {
    setContentBlocks(prev => {
      const copy = [...prev];
      if (copy[bIdx].type === 'bulletList') {
        const block = copy[bIdx] as BulletListBlock;
        block.items = block.items.filter((_, idx) => idx !== iIdx);
      }
      return copy;
    });
  };

  const addSpecTableBlock = () => {
    const newBlock: SpecTableBlock = {
      type: 'specTable',
      headers: { en: ['Property', 'Metric'], zh: ['性能属性', '规格指标'], th: ['คุณสมบัติ', 'หน่วยวัด'] },
      rows: [
        { en: ['Spec 1', 'Value 1'], zh: ['指标 1', '数值 1'], th: ['คุณสมบัติ 1', 'ค่า 1'] }
      ]
    };
    setContentBlocks(prev => [...prev, newBlock]);
  };

  const updateBlockParagraph = (idx: number, text: string) => {
    setContentBlocks(prev => {
      const copy = [...prev];
      if (copy[idx].type === 'paragraph') {
        (copy[idx] as TextBlock).content[editLang] = text;
      }
      return copy;
    });
  };

  // Command-exec for rich paragraph formatting (uncontrolled contentEditable WYSIWYG)
  const applyRichFormat = (idx: number, command: string, value: string = '') => {
    const editor = document.getElementById(`block-editor-${idx}`);
    if (!editor) return;

    editor.focus();

    if (command === 'bold') {
      document.execCommand('bold', false, undefined);
    } else if (command === 'italic') {
      document.execCommand('italic', false, undefined);
    } else if (command === 'underline') {
      document.execCommand('underline', false, undefined);
    } else if (command === 'font-family') {
      document.execCommand('fontName', false, value);
    } else if (command === 'font-size') {
      let sizeVal = '3';
      if (value === '12px') sizeVal = '2';
      else if (value === '16px') sizeVal = '3';
      else if (value === '20px') sizeVal = '4';
      else if (value === '28px') sizeVal = '6';
      document.execCommand('fontSize', false, sizeVal);
    } else if (command === 'color') {
      document.execCommand('foreColor', false, value);
    }

    updateBlockParagraph(idx, editor.innerHTML);
  };

  const moveMatrixItem = (idx: number, dir: 'up' | 'down') => {
    setTechnicalMatrix(prev => {
      const copy = [...prev];
      const target = dir === 'up' ? idx - 1 : idx + 1;
      if (target >= 0 && target < copy.length) {
        const temp = copy[idx];
        copy[idx] = copy[target];
        copy[target] = temp;
      }
      return copy;
    });
  };

  const updateSpecTableHeaders = (bIdx: number, hIdx: number, val: string) => {
    setContentBlocks(prev => {
      const copy = [...prev];
      if (copy[bIdx].type === 'specTable') {
        const table = copy[bIdx] as SpecTableBlock;
        table.headers[editLang][hIdx] = val;
      }
      return copy;
    });
  };

  const updateSpecTableCell = (bIdx: number, rIdx: number, cIdx: number, val: string) => {
    setContentBlocks(prev => {
      const copy = [...prev];
      if (copy[bIdx].type === 'specTable') {
        const table = copy[bIdx] as SpecTableBlock;
        table.rows[rIdx][editLang][cIdx] = val;
      }
      return copy;
    });
  };

  const addSpecTableRow = (bIdx: number) => {
    setContentBlocks(prev => {
      const copy = [...prev];
      if (copy[bIdx].type === 'specTable') {
        const table = copy[bIdx] as SpecTableBlock;
        const colCount = table.headers[editLang].length;
        const newRow = {
          en: Array(colCount).fill(''),
          zh: Array(colCount).fill(''),
          th: Array(colCount).fill('')
        };
        table.rows.push(newRow);
      }
      return copy;
    });
  };

  const removeBlock = (idx: number) => {
    setContentBlocks(prev => prev.filter((_, i) => i !== idx));
  };

  const moveBlock = (idx: number, dir: 'up' | 'down') => {
    setContentBlocks(prev => {
      const copy = [...prev];
      const target = dir === 'up' ? idx - 1 : idx + 1;
      if (target >= 0 && target < copy.length) {
        const temp = copy[idx];
        copy[idx] = copy[target];
        copy[target] = temp;
      }
      return copy;
    });
  };

  // Matrix Builder Helpers
  const addMatrixGroup = () => {
    const newItem: GroupMatrixItem = {
      type: 'group',
      title: { en: 'New Parameters Section', zh: '新参数板块', th: 'ข้อมูลจำเพาะใหม่' }
    };
    setTechnicalMatrix(prev => [...prev, newItem]);
  };

  const addMatrixStandard = () => {
    const newItem: StandardMatrixItem = {
      type: 'standard',
      key: { en: 'Parameter Name', zh: '参数名称', th: 'ชื่อพารามิเตอร์' },
      value: { en: 'Value details...', zh: '数据数值...', th: 'ข้อมูลค่า...' }
    };
    setTechnicalMatrix(prev => [...prev, newItem]);
  };

  const addMatrixNested = () => {
    const newItem: NestedMatrixItem = {
      type: 'nested',
      parentKey: { en: 'Main Parameter', zh: '主类别参数', th: 'พารามิเตอร์หลัก' },
      subProperties: [
        { 
          key: { en: 'Sub-key 1', zh: '子键 1', th: 'ค่าย่อย 1' }, 
          value: { en: 'Value 1', zh: '数值 1', th: 'ค่าสเปก 1' } 
        }
      ]
    };
    setTechnicalMatrix(prev => [...prev, newItem]);
  };

  const updateMatrixItem = (idx: number, field: string, val: string, subIdx?: number) => {
    setTechnicalMatrix(prev => {
      const copy = [...prev];
      const item = copy[idx];
      if (item.type === 'group' && field === 'title') {
        item.title[editLang] = val;
      } else if (item.type === 'standard') {
        if (field === 'key') item.key[editLang] = val;
        if (field === 'value') item.value[editLang] = val;
      } else if (item.type === 'nested') {
        if (field === 'parentKey') item.parentKey[editLang] = val;
        if (field === 'subKey' && subIdx !== undefined) item.subProperties[subIdx].key[editLang] = val;
        if (field === 'subVal' && subIdx !== undefined) item.subProperties[subIdx].value[editLang] = val;
      }
      return copy;
    });
  };

  const addNestedRowProp = (idx: number) => {
    setTechnicalMatrix(prev => {
      const copy = [...prev];
      const item = copy[idx];
      if (item.type === 'nested') {
        item.subProperties.push({
          key: { en: '• New attribute', zh: '• 新属性', th: '• คุณสมบัติย่อยใหม่' },
          value: { en: 'Value detail...', zh: '细节数值...', th: 'รายละเอียดค่า...' }
        });
      }
      return copy;
    });
  };

  const removeMatrixItem = (idx: number) => {
    setTechnicalMatrix(prev => prev.filter((_, i) => i !== idx));
  };

  // Submit / Save Workspace Details using relative routes
  const handleSaveProduct = async () => {
    if (!title.en || !title.zh || !title.th || !sku) {
      alert(lang === 'en' ? 'Product title (EN, ZH, & TH) and SKU are required!' : '产品标题（中英泰）与商品型号为必填项！');
      return;
    }

    const payload = {
      title,
      sku,
      department,
      subCategory,
      status,
      publishAt: publishAt ? new Date(publishAt).toISOString() : null,
      expireAt: expireAt ? new Date(expireAt).toISOString() : null,
      imagePaths,
      pdfPaths,
      contentBlocks,
      technicalMatrix,
      brand,
      variants,
      downloads,
      videoUrls,
      certifications
    };

    const method = editId ? 'PUT' : 'POST';
    const url = editId ? `/api/products/${editId}` : '/api/products';

    try {
      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert(lang === 'en' ? 'Product catalog synced successfully!' : '产品目录同步成功！');
        navigate('/dashboard');
      } else {
        const err = await res.json();
        alert(`Failed to save: ${err.error}`);
      }
    } catch (e) {
      console.error(e);
      alert('Error updating database.');
    }
  };

  const getPreviewProduct = (): any => {
    return {
      id: editId || 'preview-temp-id',
      title,
      sku,
      department,
      subCategory,
      imagePaths,
      pdfPaths,
      contentBlocks,
      technicalMatrix,
      brand,
      variants,
      downloads,
      videoUrls,
      certifications
    };
  };

  return (
    <div className="container" style={{ paddingBottom: '5rem' }}>
      {/* Header section with Preview and Save options */}
      <div className="admin-header" style={{ marginBottom: '2rem' }}>
        <div>
          <nav className="breadcrumbs-nav" style={{ paddingBottom: '0.5rem' }}>
            <Link to="/dashboard" className="breadcrumbs-link">
              {lang === 'en' ? 'Admin' : lang === 'zh' ? '管理后台' : 'แอดมิน'}
            </Link>
            <span className="breadcrumbs-sep">&gt;</span>
            <Link to="/dashboard" className="breadcrumbs-link">
              {lang === 'en' ? 'Products' : lang === 'zh' ? '产品' : 'รายการสินค้า'}
            </Link>
            <span className="breadcrumbs-sep">&gt;</span>
            <span className="breadcrumbs-current">
              {editId ? (lang === 'en' ? `Edit: ${title.en || 'Product'}` : lang === 'zh' ? `编辑: ${title.zh || title.en || '产品'}` : `แก้ไข: ${title.th || title.en || 'ผลิตภัณฑ์'}`) : (lang === 'en' ? 'New Product' : lang === 'zh' ? '创建新产品' : 'ผลิตภัณฑ์ใหม่')}
            </span>
          </nav>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>
            {editId ? (lang === 'en' ? 'Edit Product' : '编辑产品') : (lang === 'en' ? 'Create Product' : '创建产品')}
          </h2>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            type="button" 
            onClick={() => setShowPreview(true)} 
            className="btn btn-secondary"
          >
            <Eye size={16} />
            {lang === 'en' ? 'Live Preview' : '实时预览'}
          </button>
          <button 
            type="button" 
            onClick={handleSaveProduct} 
            className="btn btn-primary"
          >
            <Save size={16} />
            {lang === 'en' ? 'Save & Sync' : '保存并发布'}
          </button>
        </div>
      </div>

      <div className="workspace-grid">
        {/* Left Side: Parameters and Block Editors */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* General classification card */}
          <div className="workspace-panel">
            <h3 className="workspace-section-title">1. General Classification</h3>
            
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <button 
                type="button" 
                onClick={() => setEditLang('en')} 
                className={`btn btn-sm ${editLang === 'en' ? 'btn-primary' : 'btn-secondary'}`}
              >
                English Values
              </button>
              <button 
                type="button" 
                onClick={() => setEditLang('zh')} 
                className={`btn btn-sm ${editLang === 'zh' ? 'btn-primary' : 'btn-secondary'}`}
              >
                中文参数值
              </button>
              <button 
                type="button" 
                onClick={() => setEditLang('th')} 
                className={`btn btn-sm ${editLang === 'th' ? 'btn-primary' : 'btn-secondary'}`}
              >
                ภาษาไทย
              </button>
            </div>

            <div className="form-group">
              <label className="form-label">{lang === 'en' ? 'Product Title' : '产品标题'} ({editLang.toUpperCase()})</label>
              <input 
                type="text" 
                className="form-input"
                placeholder={editLang === 'en' ? 'e.g., Cyber Jet' : editLang === 'zh' ? '如: 武藏工程点胶机' : 'เช่น เครื่องหยอดกาวอัตโนมัติ'}
                value={title[editLang] || ''}
                onChange={(e) => setTitle({ ...title, [editLang]: e.target.value })}
              />
            </div>

            <div className="i18n-input-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
              <div className="form-group">
                <label className="form-label">{lang === 'en' ? 'Base Model / SKU' : '产品型号 SKU'}</label>
                <input 
                  type="text" 
                  className="form-input"
                  placeholder="e.g., MJET-3-CTR"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">{lang === 'en' ? 'Brand / Partner (Optional)' : '品牌 / 生产商 (可选)'}</label>
                <input 
                  type="text" 
                  className="form-input"
                  placeholder="e.g., Musashi Engineering"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">{lang === 'en' ? 'Primary Sector' : '主营部门'}</label>
                <select 
                  className="form-select"
                  value={department}
                  onChange={(e) => handleSectorChange(e.target.value)}
                >
                  <option value="" disabled>-- Select Sector --</option>
                  {taxonomy.map(sector => (
                    <option key={sector.id} value={sector.name.en}>
                      {sector.name[lang] || sector.name.en}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">{lang === 'en' ? 'Sub-Category Line Dropdown' : '细分类别系列'}</label>
              <select 
                className="form-select"
                value={subCategory.en}
                onChange={(e) => handleSubCategoryChange(e.target.value)}
                disabled={activeSubCategories.length === 0}
              >
                <option value="" disabled>-- Select Sub-Category --</option>
                {activeSubCategories.map(sub => (
                  <option key={sub.id} value={sub.name.en}>
                    {sub.name[lang] || sub.name.en}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Visibility and Scheduling settings card */}
          <div className="workspace-panel">
            <h3 className="workspace-section-title">2. Visibility & Publish Timers</h3>
            
            <div className="form-group">
              <label className="form-label">{lang === 'en' ? 'Catalog Visibility Status' : '目录可见状态'}</label>
              <select 
                className="form-select"
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
              >
                <option value="enabled">Enabled (Active on shop catalog)</option>
                <option value="disabled">Disabled (Hidden from public catalog)</option>
              </select>
            </div>

            <div className="i18n-input-grid">
              <div className="form-group">
                <label className="form-label">{lang === 'en' ? 'Publish At (Optional)' : '定时发布时间 (可选)'}</label>
                <input 
                  type="datetime-local" 
                  className="form-input"
                  value={publishAt}
                  onChange={(e) => setPublishAt(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">{lang === 'en' ? 'Expire At (Optional)' : '自动下架时间 (可选)'}</label>
                <input 
                  type="datetime-local" 
                  className="form-input"
                  value={expireAt}
                  onChange={(e) => setExpireAt(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Media & Datasheets upload section */}
          <div className="workspace-panel">
            <h3 className="workspace-section-title">3. Upload Banners & PDFs</h3>
            
            <div className="i18n-input-grid">
              <div>
                <label className="form-label">{lang === 'en' ? 'Add Product Banners' : '添加产品主图/横幅'}</label>
                <div className="file-dropzone" onClick={() => document.getElementById('image-upload-el')?.click()}>
                  <Upload size={20} style={{ margin: '0 auto 0.5rem', color: 'var(--primary)' }} />
                  <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Upload Image File</span>
                  <input 
                    type="file" 
                    id="image-upload-el" 
                    multiple 
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => handleFileUpload(e, 'image')}
                  />
                </div>
                
                {imagePaths.length > 0 && (
                  <div className="uploaded-files-list">
                    {imagePaths.map((p, i) => (
                      <div key={i} className="uploaded-file-item">
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.substring(p.lastIndexOf('/') + 1)}</span>
                        <Trash2 size={12} style={{ color: '#ef4444', cursor: 'pointer' }} onClick={() => setImagePaths(prev => prev.filter((_, idx) => idx !== i))} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="form-label">{lang === 'en' ? 'Add Technical Manual PDFs' : '添加技术手册PDF'}</label>
                <div className="file-dropzone" onClick={() => document.getElementById('pdf-upload-el')?.click()}>
                  <FileText size={20} style={{ margin: '0 auto 0.5rem', color: '#ef4444' }} />
                  <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Upload PDF File</span>
                  <input 
                    type="file" 
                    id="pdf-upload-el" 
                    multiple 
                    accept="application/pdf"
                    style={{ display: 'none' }}
                    onChange={(e) => handleFileUpload(e, 'pdf')}
                  />
                </div>

                {pdfPaths.length > 0 && (
                  <div className="uploaded-files-list">
                    {pdfPaths.map((p, i) => (
                      <div key={i} className="uploaded-file-item">
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.substring(p.indexOf('-') + 1)}</span>
                        <Trash2 size={12} style={{ color: '#ef4444', cursor: 'pointer' }} onClick={() => setPdfPaths(prev => prev.filter((_, idx) => idx !== i))} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Complex Hardware Extras */}
          <div className="workspace-panel">
            <h3 className="workspace-section-title">Hardware Extensions (Variants, Videos, Certs)</h3>
            
            {/* Certifications */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">{lang === 'en' ? 'Certifications (e.g. CE, ISO Class 5)' : '认证 (如CE, ISO Class 5)'}</label>
              {certifications.map((c, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <input type="text" className="form-input" value={c} onChange={(e) => updateCertification(idx, e.target.value)} />
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => removeCertification(idx)}><Trash2 size={12} color="#ef4444" /></button>
                </div>
              ))}
              <button type="button" className="btn btn-secondary btn-sm" onClick={addCertification}>+ Add Certification</button>
            </div>

            {/* Video URLs */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">{lang === 'en' ? 'Demonstration Videos (YouTube/Vimeo URLs)' : '演示视频 (YouTube链接)'}</label>
              {videoUrls.map((v, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <input type="text" className="form-input" value={v} onChange={(e) => updateVideoUrl(idx, e.target.value)} />
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => removeVideoUrl(idx)}><Trash2 size={12} color="#ef4444" /></button>
                </div>
              ))}
              <button type="button" className="btn btn-secondary btn-sm" onClick={addVideoUrl}>+ Add Video</button>
            </div>

            {/* Structured Downloads */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">{lang === 'en' ? 'Structured Downloads (Manuals, Datasheets)' : '文档下载'}</label>
              {downloads.map((d, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                  <select className="form-input" style={{ width: '120px' }} value={d.type} onChange={(e) => updateDownload(idx, 'type', e.target.value)}>
                    <option value="manual">Manual</option>
                    <option value="datasheet">Datasheet</option>
                    <option value="certificate">Certificate</option>
                    <option value="other">Other</option>
                  </select>
                  <input type="text" className="form-input" placeholder="Title..." value={d.title[editLang] || ''} onChange={(e) => updateDownload(idx, 'title', e.target.value)} />
                  <input type="text" className="form-input" placeholder="File URL / Path..." value={d.url} onChange={(e) => updateDownload(idx, 'url', e.target.value)} />
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => removeDownload(idx)}><Trash2 size={12} color="#ef4444" /></button>
                </div>
              ))}
              <button type="button" className="btn btn-secondary btn-sm" onClick={addDownload}>+ Add Download</button>
            </div>

            {/* Variants */}
            <div>
              <label className="form-label">{lang === 'en' ? 'Ordering Options (Variants/SKUs)' : '订购选项 (型号)'}</label>
              {variants.map((v, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                  <input type="text" className="form-input" style={{ width: '150px' }} placeholder="SKU..." value={v.sku} onChange={(e) => updateVariant(idx, 'sku', e.target.value)} />
                  <input type="text" className="form-input" placeholder="Variant Name..." value={v.name[editLang] || ''} onChange={(e) => updateVariant(idx, 'name', e.target.value)} />
                  <input type="text" className="form-input" placeholder="Specs (e.g. 120V)..." value={v.specs} onChange={(e) => updateVariant(idx, 'specs', e.target.value)} />
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => removeVariant(idx)}><Trash2 size={12} color="#ef4444" /></button>
                </div>
              ))}
              <button type="button" className="btn btn-secondary btn-sm" onClick={addVariant}>+ Add Variant</button>
            </div>
          </div>

          {/* Flowable Content Blocks */}
          <div className="workspace-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                4. Flowable Content Blocks (Article Editor)
              </h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" onClick={addParagraphBlock} className="btn btn-secondary btn-sm">
                  + Paragraph
                </button>
                <button type="button" onClick={addBulletListBlock} className="btn btn-secondary btn-sm">
                  + Bullet List
                </button>
                <button type="button" onClick={addSpecTableBlock} className="btn btn-secondary btn-sm">
                  + Spec Table
                </button>
              </div>
            </div>

            <div className="blocks-editor-list">
              {contentBlocks.map((block, idx) => (
                <div key={idx} className="editor-block-card">
                  <div className="editor-block-card-header">
                    <span className="editor-block-card-title">
                      <Layout size={12} /> {block.type === 'paragraph' ? 'Paragraph Block' : block.type === 'bulletList' ? 'Bullet List Block' : 'Spec Table Block'}
                    </span>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button type="button" onClick={() => moveBlock(idx, 'up')} className="btn btn-secondary btn-sm" style={{ padding: '0.2rem' }} disabled={idx === 0}>
                        <ArrowUp size={10} />
                      </button>
                      <button type="button" onClick={() => moveBlock(idx, 'down')} className="btn btn-secondary btn-sm" style={{ padding: '0.2rem' }} disabled={idx === contentBlocks.length - 1}>
                        <ArrowDown size={10} />
                      </button>
                      <button type="button" onClick={() => removeBlock(idx)} className="btn btn-secondary btn-sm" style={{ padding: '0.2rem', color: '#ef4444' }}>
                        <Trash2 size={10} />
                      </button>
                    </div>
                  </div>

                  {block.type === 'paragraph' ? (
                    <div>
                      {/* Rich Text formatting toolbar */}
                      <div className="rich-editor-toolbar">
                        <button type="button" className="rich-editor-btn" onMouseDown={(e) => e.preventDefault()} onClick={() => applyRichFormat(idx, 'bold')}>B</button>
                        <button type="button" className="rich-editor-btn" onMouseDown={(e) => e.preventDefault()} onClick={() => applyRichFormat(idx, 'italic')}>I</button>
                        <button type="button" className="rich-editor-btn" onMouseDown={(e) => e.preventDefault()} onClick={() => applyRichFormat(idx, 'underline')}>U</button>
                        
                        <select className="rich-editor-select" onMouseDown={(e) => e.stopPropagation()} onChange={(e) => applyRichFormat(idx, 'font-family', e.target.value)} defaultValue="">
                          <option value="" disabled>Font</option>
                          <option value="sans-serif">Sans-Serif (Standard)</option>
                          <option value="serif">Serif (Times)</option>
                          <option value="monospace">Monospace</option>
                          <option value="cursive">Cursive</option>
                        </select>

                        <select className="rich-editor-select" onMouseDown={(e) => e.stopPropagation()} onChange={(e) => applyRichFormat(idx, 'font-size', e.target.value)} defaultValue="">
                          <option value="" disabled>Size</option>
                          <option value="12px">Small</option>
                          <option value="16px">Normal</option>
                          <option value="20px">Large</option>
                          <option value="28px">Heading</option>
                        </select>

                        <select className="rich-editor-select" onMouseDown={(e) => e.stopPropagation()} onChange={(e) => applyRichFormat(idx, 'color', e.target.value)} defaultValue="">
                          <option value="" disabled>Color</option>
                          <option value="#1e293b">Dark Slate</option>
                          <option value="#0284c7">Douyee Blue</option>
                          <option value="#dc2626">Warning Red</option>
                          <option value="#10b981">Green</option>
                        </select>
                      </div>

                      <div className="rich-textarea-wrapper">
                        <div 
                          id={`block-editor-${idx}`}
                          key={`${idx}-${editLang}`}
                          className="rich-editor-textarea"
                          contentEditable
                          style={{ 
                            minHeight: '120px', 
                            whiteSpace: 'pre-wrap', 
                            backgroundColor: 'white', 
                            border: '1px solid var(--border-color)', 
                            borderRadius: '0 0 var(--radius-md) var(--radius-md)', 
                            padding: '0.75rem',
                            outline: 'none',
                            overflowY: 'auto'
                          }}
                          dangerouslySetInnerHTML={{ __html: (block as TextBlock).content[editLang] || '' }}
                          onBlur={(e) => {
                            updateBlockParagraph(idx, e.currentTarget.innerHTML);
                          }}
                        />
                      </div>
                    </div>
                  ) : block.type === 'bulletList' ? (
                    <div className="bullet-list-editor">
                      {(block as BulletListBlock).items.map((item, iIdx) => (
                        <div key={iIdx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <span style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>•</span>
                          <input
                            type="text"
                            className="form-input"
                            value={item[editLang] || ''}
                            onChange={(e) => updateBulletListItem(idx, iIdx, e.target.value)}
                            placeholder={lang === 'en' ? 'Feature description...' : '特点描述...'}
                          />
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0.25rem', color: '#ef4444' }}
                            onClick={() => removeBulletListItem(idx, iIdx)}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                      <button 
                        type="button" 
                        onClick={() => addBulletListItem(idx)} 
                        className="btn btn-secondary btn-sm"
                        style={{ marginTop: '0.5rem' }}
                      >
                        + Add Bullet Item
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="spec-table-editor-wrapper">
                        <table className="spec-table-editor">
                          <thead>
                            <tr>
                              {(block as SpecTableBlock).headers[editLang].map((header, hIdx) => (
                                <th key={hIdx}>
                                  <input 
                                    type="text" 
                                    value={header || ''} 
                                    onChange={(e) => updateSpecTableHeaders(idx, hIdx, e.target.value)}
                                  />
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {(block as SpecTableBlock).rows.map((row, rIdx) => (
                              <tr key={rIdx}>
                                {row[editLang].map((cell, cIdx) => (
                                  <td key={cIdx}>
                                    <input 
                                      type="text" 
                                      value={cell || ''} 
                                      onChange={(e) => updateSpecTableCell(idx, rIdx, cIdx, e.target.value)}
                                    />
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => addSpecTableRow(idx)} 
                        className="btn btn-secondary btn-sm"
                        style={{ marginTop: '0.5rem' }}
                      >
                        + Add Spec Row
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Deep Matrix Specification Builder */}
          <div className="workspace-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                5. Deep Matrix Specification Builder
              </h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" onClick={addMatrixGroup} className="btn btn-secondary btn-sm">
                  + Section Header
                </button>
                <button type="button" onClick={addMatrixStandard} className="btn btn-secondary btn-sm">
                  + Standard Row
                </button>
                <button type="button" onClick={addMatrixNested} className="btn btn-secondary btn-sm">
                  + Split Row
                </button>
              </div>
            </div>

            <div className="blocks-editor-list">
              {technicalMatrix.map((item, idx) => (
                <div key={idx} className="editor-block-card" style={{ borderLeft: `4px solid ${item.type === 'group' ? '#475569' : item.type === 'standard' ? 'var(--primary)' : 'var(--accent)'}` }}>
                  <div className="editor-block-card-header">
                    <span className="editor-block-card-title">
                      <Layers size={12} /> {item.type === 'group' ? 'Group Header Row' : item.type === 'standard' ? 'Standard Key-Value Row' : 'Split/Nested Row'}
                    </span>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button type="button" onClick={() => moveMatrixItem(idx, 'up')} className="btn btn-secondary btn-sm" style={{ padding: '0.2rem' }} disabled={idx === 0}>
                        <ArrowUp size={10} />
                      </button>
                      <button type="button" onClick={() => moveMatrixItem(idx, 'down')} className="btn btn-secondary btn-sm" style={{ padding: '0.2rem' }} disabled={idx === technicalMatrix.length - 1}>
                        <ArrowDown size={10} />
                      </button>
                      <button type="button" onClick={() => removeMatrixItem(idx)} className="btn btn-secondary btn-sm" style={{ padding: '0.2rem', color: '#ef4444' }}>
                        <Trash2 size={10} />
                      </button>
                    </div>
                  </div>

                  {item.type === 'group' ? (
                    <div className="form-group">
                      <label className="form-label">Section Title</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        value={item.title?.[editLang] || ''}
                        onChange={(e) => updateMatrixItem(idx, 'title', e.target.value)}
                      />
                    </div>
                  ) : item.type === 'standard' ? (
                    <div className="i18n-input-grid">
                      <div className="form-group">
                        <label className="form-label">Parameter Key</label>
                        <input 
                          type="text" 
                          className="form-input" 
                          value={item.key?.[editLang] || ''}
                          onChange={(e) => updateMatrixItem(idx, 'key', e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Value</label>
                        <input 
                          type="text" 
                          className="form-input" 
                          value={item.value?.[editLang] || ''}
                          onChange={(e) => updateMatrixItem(idx, 'value', e.target.value)}
                        />
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div className="form-group">
                        <label className="form-label">Split Parent Group Key</label>
                        <input 
                          type="text" 
                          className="form-input" 
                          value={item.parentKey?.[editLang] || ''}
                          onChange={(e) => updateMatrixItem(idx, 'parentKey', e.target.value)}
                        />
                      </div>
                      
                      <div className="matrix-nested-child-list" style={{ paddingLeft: '1rem', borderLeft: '2px solid var(--accent-border)' }}>
                        <label className="form-label">Nested Child Keys & Values Mapping</label>
                        {item.subProperties?.map((prop, sIdx) => (
                          <div key={sIdx} className="i18n-input-grid" style={{ marginBottom: '0.5rem' }}>
                            <input 
                              type="text" 
                              className="form-input" 
                              value={prop.key[editLang] || ''}
                              onChange={(e) => updateMatrixItem(idx, 'subKey', e.target.value, sIdx)}
                              placeholder="• Sub-attribute key"
                            />
                            <input 
                              type="text" 
                              className="form-input" 
                              value={prop.value[editLang] || ''}
                              onChange={(e) => updateMatrixItem(idx, 'subVal', e.target.value, sIdx)}
                              placeholder="Sub-value detail..."
                            />
                          </div>
                        ))}
                      </div>

                      <button 
                        type="button" 
                        onClick={() => addNestedRowProp(idx)} 
                        className="btn btn-secondary btn-sm"
                        style={{ alignSelf: 'flex-start' }}
                      >
                        + Append Nested Child Step
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Side: Ledger Sidebar for Quick Switching */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="workspace-panel">
            <h3 style={{ fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-main)', marginBottom: '0.5rem' }}>
              Live Infrastructure Index
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '1rem' }}>
              Select an item to load into the workspace editor.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '500px', overflowY: 'auto' }}>
              <div 
                style={{ display: 'flex', gap: '0.75rem', padding: '0.75rem', backgroundColor: 'var(--primary-light)', border: '1px solid var(--primary)', borderRadius: 'var(--radius-md)', pointerEvents: 'none' }}
              >
                <div style={{ width: '2rem', height: '2rem', borderRadius: '4px', backgroundColor: 'var(--primary)', color: 'white', fontWeight: 'bold', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  CURR
                </div>
                <div>
                  <strong style={{ display: 'block', fontSize: '0.75rem', color: 'var(--primary-dark)' }}>
                    {title[lang] || 'Draft Listing'}
                  </strong>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Currently Editing</span>
                </div>
              </div>

              {otherProducts.map((p) => (
                <div 
                  key={p.id}
                  onClick={() => navigate(`/workspace?id=${p.id}`)}
                  style={{ display: 'flex', gap: '0.75rem', padding: '0.75rem', backgroundColor: 'var(--light-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'border-color 0.15s ease' }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                >
                  <div style={{ width: '2rem', height: '2rem', borderRadius: '4px', backgroundColor: '#e2e8f0', color: 'var(--text-muted)', fontWeight: 'bold', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    PROD
                  </div>
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-main)' }}>{p.title[lang]}</strong>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>SKU: {p.sku}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* Live Preview Modal Overlay Component */}
      {showPreview && (
        <div className="preview-modal-backdrop">
          <div className="preview-modal-content">
            <div className="preview-modal-header">
              <h3 style={{ fontWeight: 800, fontSize: '1.125rem' }}>
                {lang === 'en' ? 'Live Design Page Preview' : lang === 'zh' ? '实时设计页面预览' : 'ดูการแสดงผลหน้าตัวอย่าง'}
              </h3>
              <button 
                type="button" 
                onClick={() => setShowPreview(false)} 
                className="btn btn-secondary btn-sm"
                style={{ padding: '0.35rem' }}
              >
                <X size={16} />
              </button>
            </div>
            <div className="preview-modal-body">
              <div className="container" style={{ pointerEvents: 'none' }}>
                <ProductDetailViewMock product={getPreviewProduct()} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Mock product detail renderer for live preview inside modal frame
const ProductDetailViewMock: React.FC<{ product: any }> = ({ product }) => {
  const { lang, t } = useI18n();
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  return (
    <div style={{ paddingBottom: '2rem' }}>
      <div className="detail-header">
        <span className="product-card-tag" style={{ marginBottom: '0.75rem' }}>
          {product.department}
        </span>
        <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>{product.title[lang] || 'No English/Chinese/Thai Title'}</h2>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          <span>{t('sku')}: <strong style={{ fontFamily: 'var(--font-mono)' }}>{product.sku || 'N/A'}</strong></span>
          <span>•</span>
          <span>{product.subCategory[lang] || 'No Subcategory Value'}</span>
        </div>
      </div>

      <div className="detail-layout">
        <div className="image-gallery">
          <div className="main-image-wrapper">
            {product.imagePaths && product.imagePaths.length > 0 ? (
              <img 
                src={product.imagePaths[activeImageIdx]} 
                alt={product.title[lang]} 
                className="main-image"
              />
            ) : (
              <div className="product-placeholder-img" style={{ fontSize: '4rem' }}>DY</div>
            )}
          </div>
          
          {product.imagePaths && product.imagePaths.length > 1 && (
            <div className="thumbnails-grid">
              {product.imagePaths.map((path: string, idx: number) => (
                <div 
                  key={idx} 
                  className={`thumbnail-wrapper ${idx === activeImageIdx ? 'active' : ''}`}
                  onClick={() => setActiveImageIdx(idx)}
                >
                  <img src={path} alt="Thumbnail" className="thumbnail-img" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="info-content">
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
              Product Information
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
              <p><strong>Sector:</strong> {product.department}</p>
              <p><strong>Category Line:</strong> {product.subCategory[lang]}</p>
              <p><strong>SKU Code:</strong> {product.sku}</p>
            </div>
          </div>

          {product.pdfPaths && product.pdfPaths.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
                {t('downloads')}
              </h3>
              <div className="manuals-list">
                {product.pdfPaths.map((path: string, idx: number) => {
                  const filename = path.substring(path.lastIndexOf('/') + 1);
                  const cleanFilename = filename.substring(filename.indexOf('-') + 1);
                  return (
                    <div key={idx} className="pdf-link">
                      <FileText size={16} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {cleanFilename}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {product.contentBlocks && product.contentBlocks.length > 0 && (
        <div className="detail-content-blocks">
          {product.contentBlocks.map((block: any, idx: number) => {
            if (block.type === 'paragraph' && block.content) {
              return (
                <div 
                  key={idx} 
                  className="rich-paragraph-block"
                  dangerouslySetInnerHTML={{ __html: block.content[lang] || '' }}
                />
              );
            } else if (block.type === 'specTable' && block.headers && block.rows) {
              const headers = block.headers[lang] || [];
              const rows = block.rows || [];
              return (
                <div key={idx} style={{ overflowX: 'auto' }}>
                  <table className="spec-table-block">
                    <thead>
                      <tr>
                        {headers.map((h: string, hIdx: number) => (
                          <th key={hIdx}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row: any, rIdx: number) => {
                        const columns = row[lang] || [];
                        return (
                          <tr key={rIdx}>
                            {columns.map((col: string, cIdx: number) => (
                              <td key={cIdx}>{col}</td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            }
            return null;
          })}
        </div>
      )}

      {product.technicalMatrix && product.technicalMatrix.length > 0 && (
        <div className="matrix-section">
          <h3 className="matrix-title">
            <Layers size={20} style={{ color: 'var(--primary)' }} />
            {t('specifications')}
          </h3>
          
          <div className="matrix-table-wrapper">
            <table className="matrix-table">
              <thead>
                <tr>
                  <th style={{ width: '42%' }}>{t('matrixProperty')}</th>
                  <th style={{ width: '58%' }}>{t('matrixValue')}</th>
                </tr>
              </thead>
              <tbody>
                {product.technicalMatrix.map((item: any, idx: number) => {
                  if (item.type === 'group' && item.title) {
                    return (
                      <tr key={idx} className="matrix-group-row">
                        <td colSpan={2}>
                          <span className="matrix-group-badge">Group</span>
                          {item.title[lang]}
                        </td>
                      </tr>
                    );
                  } else if (item.type === 'standard' && item.key && item.value) {
                    return (
                      <tr key={idx} className="matrix-standard-row">
                        <td style={{ fontWeight: 600, paddingLeft: '1.5rem' }}>
                          {item.key[lang]}
                        </td>
                        <td>
                          {item.value[lang]}
                        </td>
                      </tr>
                    );
                  } else if (item.type === 'nested' && item.parentKey && item.subProperties) {
                    return (
                      <tr key={idx} className="matrix-nested-row">
                        <td style={{ verticalAlign: 'top', paddingLeft: '1.5rem' }}>
                          <span className="matrix-nested-parent-key">{item.parentKey[lang]}</span>
                          <div className="matrix-nested-child-list">
                            {item.subProperties.map((sub: any, sIdx: number) => (
                              <div key={sIdx} className="matrix-nested-child-item">
                                {sub.key[lang]}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td style={{ verticalAlign: 'top' }}>
                          <div className="matrix-nested-value-list">
                            {item.subProperties.map((sub: any, sIdx: number) => (
                              <div key={sIdx} className="matrix-nested-value-item">
                                <span className="matrix-nested-badge">Spec</span>
                                {sub.value[lang]}
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  }
                  return null;
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminWorkspaceView;
