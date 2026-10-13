import React from 'react';
import { useI18n } from '../i18n';

type Block =
  | { kind: 'p'; text: string; lead?: string }
  | { kind: 'h'; text: string }
  | { kind: 'ul'; items: string[] };

const TH: Block[] = [
  { kind: 'p', lead: 'ยูโรสแตท (Eurostat)', text: 'ผลิตภัณฑ์รองเท้าเซฟตี้ภายใต้แบรนด์ยูโรสแตท (Eurostat) ถือกำเนิดขึ้นจากการร่วมมือกันระหว่างกลุ่มบริษัทยูโรสแตท และบริษัทดาวี เอ็นเตอร์ไพรส์ จก.' },
  { kind: 'p', text: 'บริษัทยูโรสแตทกลายเป็นผู้นำในทวีปยุโรปที่สามารถผลิตและจัดจำหน่ายสินค้าที่เกี่ยวกับการป้องกันการเกิดไฟฟ้าสถิต (ESD) โดยมีสำนักงานใหญ่ตั้งอยู่ที่ประเทศฝรั่งเศส มีเนื้อที่กว่า 5000 ตารางเมตร และยังมีสาขาอยู่ในประเทศต่างๆอีก คือ เนเธอร์แลนด์ สวีเดน และสหราชอาณาจักร รวมไปถึงเครือข่ายผู้แทนจำหน่ายอยู่ทั่วทวีปยุโรป กำลังการผลิตประจำปีทำได้ถึง 1.5 ล้านคู่ต่อปี' },
  { kind: 'p', text: 'บริษัทดาวี เอ็นเตอร์ไพรส์ จก. เป็นบริษัทชั้นนำในภูมิภาคเอเชียแปซิฟิกเรื่องการดูแลและแก้ปัญหาที่เกี่ยวกับสินค้าอุตสาหกรรมให้เป็นไปตามความต้องการของลูกค้าแบบครบวงจร บริษัทดาวีฯ ได้ให้บริการในอุตสาหกรรมสาขาต่างๆ เช่น เซมิคอนดักเตอร์ (Semiconductor) การจัดเก็บข้อมูล (Data storage) ไฟฟ้า (Electronics) และชีวการแพทย์ (Biomedical) เรามีโรงงานผลิตสินค้าตั้งอยู่ในหลายประเทศ ทั้งประเทศสิงคโปร์ มาเลเซีย และจีน โดยโรงงานทั้งหมดได้รับการรับรองคุณภาพมาตรฐานการจัดการจาก ISO 9001:2008 และ ISO 14001:2004' },
  { kind: 'p', text: 'ผลิตภัณฑ์รองเท้าเซฟตี้ Eurostat ผลิตขึ้นภายใต้ระบบการควบคุมคุณภาพอย่างเข้มงวด ได้มาตรฐาน EN ISO 20345:2011, EN ISO 20345:2022 (CE) โดยรองเท้าของเรามีคุณสมบัติพิเศษ ดังนี้' },
  {
    kind: 'ul',
    items: [
      'หัวรองเท้าเป็นหัวเหล็ก หรือ หัวคอมโพสิต ป้องกันการกระแทก 200 จูล',
      'มีพื้นเหล็ก หรือ พื้นคอมโพสิต คั่นกลางเพื่อกันการเจาะของวัตถุแหลมคม',
      'พื้นรองเท้ากันลื่น และกันน้ำมัน',
      'ทนความร้อน ป้องกันแรงกระแทก และสามารถทนกรด และสารเคมีได้ดี',
      'ป้องกันการเกิดไฟฟ้าสถิต (ESD Control)'
    ]
  },
  { kind: 'p', text: 'ผลิตภัณฑ์รองเท้าเซฟตี้ Eurostat ยังถูกออกแบบมาเพื่อปกป้องเท้าของคุณ เหมาะที่จะใช้ในอุตสาหกรรมสาขาต่างๆ เช่น น้ำมันและก๊าซ อุตสาหกรรมทางทะเลและนอกชายฝั่ง อุตสาหกรรม การก่อสร้าง อุตสาหกรรมเหมือง อุตสาหกรรมการผลิต อุตสาหกรรมยานยนต์และยานอวกาศ อุตสาหกรรมโลจิสติกส์ อุตสาหกรรมทหาร และอุตสาหกรรมการเกษตร' },
  { kind: 'p', text: 'รองเท้ากันลื่นของเรามีพื้นรองเท้ากันลื่นแบบพิเศษที่ได้รับการจดสิทธิบัตรเรียบร้อยแล้ว เหมาะสำหรับใช้งานในโรงแรม การทำอาหาร ใช้เป็นรองเท้าเครื่องแบบ หรือเหมาะสมสำหรับคนที่ต้องทำงานในสภาพแวดล้อมที่มีพื้นลื่น' }
];

const EN: Block[] = [
  { kind: 'p', text: 'Eurostat Safety Footwear was created through a collaboration between Eurostat Group and Dou Yee Enterprises Pte Ltd.' },
  { kind: 'p', text: 'Eurostat is a leading European company specializing in the manufacturing and distribution of Electrostatic Discharge (ESD) protection products. Its headquarters are located in France, with facilities covering more than 5,000 square meters. Eurostat also has offices in the Netherlands, Sweden, and the United Kingdom, together with a strong distributor network across Europe.' },
  { kind: 'p', text: 'Eurostat has an annual production capacity of up to 1.5 million pairs of safety shoes per year.' },
  { kind: 'h', text: 'About Dou Yee Enterprises' },
  { kind: 'p', text: 'Dou Yee Enterprises Pte Ltd. is a leading company in the Asia-Pacific region, providing integrated solutions and industrial products to meet customers’ specific requirements.' },
  { kind: 'p', text: 'Dou Yee serves a wide range of industries, including:' },
  { kind: 'ul', items: ['Semiconductor', 'Data Storage', 'Electronics', 'Biomedical ETC.'] },
  { kind: 'p', text: 'The company operates manufacturing facilities in Singapore, Malaysia, and China. Its manufacturing operations are certified under internationally recognized quality and environmental management standards, including ISO 9001:2008 and ISO 14001:2004.' },
  { kind: 'h', text: 'Eurostat Safety Footwear – Quality & Protection' },
  { kind: 'p', text: 'Eurostat safety footwear is manufactured under strict quality control systems and complies with EN ISO 20345:2011 and EN ISO 20345:2022 (CE) standards.' },
  { kind: 'p', text: 'Our safety shoes are designed with key protective features, including:' },
  {
    kind: 'ul',
    items: [
      'Steel or composite toe caps providing impact protection up to 200 Joules',
      'Steel or composite puncture-resistant midsoles to protect against sharp objects',
      'Slip-resistant and oil-resistant outsoles',
      'Good resistance to heat, impact, acids, and chemicals',
      'ESD Control to help protect against electrostatic discharge',
      'Designed for a Wide Range of Industries'
    ]
  },
  { kind: 'p', text: 'Eurostat safety footwear is designed to provide reliable foot protection for many industrial working environments, including:' },
  {
    kind: 'ul',
    items: [
      'Oil & Gas',
      'Marine & Offshore',
      'Construction',
      'Mining',
      'Manufacturing',
      'Automotive & Aerospace',
      'Logistics',
      'Military',
      'Agriculture',
      'Special Slip-Resistant Footwear'
    ]
  },
  { kind: 'p', text: 'Eurostat also offers slip-resistant footwear featuring a specially designed and patented anti-slip outsole. These shoes are ideal for working environments where slippery floors are common, such as:' },
  {
    kind: 'ul',
    items: ['Hotels', 'Food Service & Catering', 'Uniformed Work', 'Kitchens and Food Preparation Areas', 'Other workplaces with wet or slippery floor conditions']
  },
  { kind: 'p', text: 'Eurostat Safety Footwear – Reliable Protection, Comfort, and Safety for Every Workplace.' }
];

const AboutView: React.FC = () => {
  const { lang } = useI18n();
  const blocks = lang === 'th' ? TH : EN;

  return (
    <div className="site-panel-padded">
      <div className="site-about">
        <div className="site-about-text">
          <img className="site-about-logo" src="/assets/eurostat-logo.png" alt="Eurostat, a member of Dou Yee" />
          {blocks.map((b, i) => {
            if (b.kind === 'h') return <h3 key={i}>{b.text}</h3>;
            if (b.kind === 'ul') {
              return (
                <ul key={i}>
                  {b.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              );
            }
            return (
              <p key={i}>
                {b.lead && (
                  <>
                    <strong>{b.lead}</strong>
                    <br />
                  </>
                )}
                {b.text}
              </p>
            );
          })}
        </div>
        <img className="site-about-poster" src="/assets/about-poster.jpg" alt="Eurostat safety footwear" />
      </div>
      <img className="site-cert-icons" src="/assets/cert-icons.png" alt="Safety footwear classes SB, S1, S1P, S2, S3 with CE and SNI marks" />
    </div>
  );
};

export default AboutView;
