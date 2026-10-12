import { getProducts, saveProducts, Product } from './src/db';

async function seed() {
  const products = await getProducts();
  const product: Product = {
    id: "prod-6432e-demo",
    title: { en: "Model 6432e Local Area Ionizing Blower", zh: "Model 6432e 局部区域离子风机", th: "เครื่องกำเนิดไอออนเฉพาะจุด รุ่น 6432e" },
    sku: "6432e",
    department: "sector-esd",
    subCategory: { en: "Ionizers", zh: "离子消电器", th: "เครื่องกำจัดไฟฟ้าสถิต" },
    status: "enabled",
    brand: "Simco-Ion",
    certifications: ["ISO 14644-1 Class 5", "CE", "RoHS"],
    videoUrls: [],
    imagePaths: [],
    pdfPaths: [],
    downloads: [
      { url: "https://www.douyee.com/files/6432e-manual.pdf", title: { en: "User Manual", zh: "用户手册", th: "คู่มือผู้ใช้" }, type: "manual" },
      { url: "https://www.douyee.com/files/6432e-datasheet.pdf", title: { en: "Datasheet", zh: "技术规格书", th: "เอกสารข้อมูล" }, type: "datasheet" }
    ],
    variants: [
      { sku: "4011425", name: { en: "120V, 60Hz with stand", zh: "120V, 60Hz 连支架", th: "120V, 60Hz พร้อมขาตั้ง" }, specs: "120 VAC, includes US plug" },
      { sku: "4011426", name: { en: "230V, 50Hz with stand", zh: "230V, 50Hz 连支架", th: "230V, 50Hz พร้อมขาตั้ง" }, specs: "230 VAC, includes EU plug" }
    ],
    contentBlocks: [
      {
        type: "paragraph",
        content: {
          en: "The Simco-Ion Model 6432e is a Point-of-Use Ionizing Blower designed to control static discharge in assembly, inspection, and packaging areas, as well as in-tool environments where static build-up can cause issues like product contamination, material mis-handling, or microprocessor lock-up.",
          zh: "Simco-Ion Model 6432e 局部区域离子风机专为控制装配、检测和包装区域以及设备内部环境中的静电放电而设计。",
          th: "เครื่องเป่าลมไอออน Simco-Ion Model 6432e ได้รับการออกแบบมาเพื่อควบคุมการเกิดประจุไฟฟ้าสถิต"
        }
      },
      {
        type: "bulletList",
        items: [
          { en: "IsoStat® Technology for steady-state DC ion emission", zh: "IsoStat® 技术提供稳态直流离子发射", th: "เทคโนโลยี IsoStat®" },
          { en: "Compact Design for constrained spaces", zh: "紧凑设计适合狭小空间", th: "ดีไซน์กะทัดรัด" },
          { en: "Cleanroom Class 5 Compatible", zh: "兼容 Class 5 洁净室", th: "เข้ากันได้กับห้องคลีนรูม" },
          { en: "Facility Monitoring System (FMS) interface", zh: "设备监控系统 (FMS) 接口", th: "ระบบการเฝ้าระวัง" }
        ]
      }
    ],
    technicalMatrix: [
      {
        type: "group",
        title: { en: "General Specifications", zh: "一般规格", th: "ข้อมูลจำเพาะทั่วไป" }
      },
      {
        type: "standard",
        key: { en: "Decay Time", zh: "消电时间", th: "เวลาการสลาย" },
        value: { en: "<4 seconds @ 30cm", zh: "<4 秒 @ 30厘米", th: "<4 วินาที ที่ระยะ 30ซม." }
      },
      {
        type: "standard",
        key: { en: "Balance", zh: "离子平衡", th: "สมดุลไอออน" },
        value: { en: "± 20 V @ 30cm", zh: "± 20 V @ 30厘米", th: "± 20 V ที่ 30ซม." }
      },
      {
        type: "standard",
        key: { en: "Airflow", zh: "风量", th: "ปริมาณลม" },
        value: { en: "1.39 m³/min (typical)", zh: "1.39 m³/min (典型值)", th: "1.39 ลบ.ม./นาที" }
      }
    ],
    createdAt: new Date().toISOString()
  };

  const existingIndex = products.findIndex(p => p.sku === '6432e');
  if (existingIndex >= 0) {
    products[existingIndex] = product;
  } else {
    products.push(product);
  }

  await saveProducts(products);
  console.log("Seeded Model 6432e successfully!");
}

seed().catch(console.error);
