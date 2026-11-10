import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useI18n } from '../i18n';

const EMAIL = 'panjaruts@douyee.co.th';
const MAP_QUERY = '75/27 Moo 11 Phaholyothin Rd, Khlong Nueng, Khlong Luang, Pathum Thani 12120';

const ContactView: React.FC = () => {
  const { lang } = useI18n();
  const [searchParams] = useSearchParams();
  const sku = searchParams.get('sku');
  const product = searchParams.get('product');

  // Product pages link here with ?product=&sku= so the inquiry email is prefilled
  const subject = product ? `Inquiry: ${product}${sku ? ` (${sku})` : ''}` : '';
  const mailto = `mailto:${EMAIL}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`;

  return (
    <div className="site-panel-padded site-contact">
      <img className="site-contact-art" src="/assets/contact-illustration.png" alt="" />
      <div className="site-contact-box">
        <h2>{lang === 'th' ? 'ติดต่อเรา' : 'Get in touch with us'}</h2>
        <div className="site-contact-addresses">
          <p>
            DOU YEE ENTERPRISES (THAILAND) CO.,LTD<br />
            75/27 Moo 11, Phaholyothin Rd, T.Klongnueng,<br />
            A.Klongluang, Pathumthani 12120 , Thailand<br />
            Tel: <a href="tel:+6625290979">+662 529 0979</a><br />
            E-mail : <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
          </p>
          <p>
            <strong>
              บริษัท ดาวยี เอนเตอร์ไพรส์ (ประเทศไทย) จำกัด<br />
              75/27 หมู่ที่ 11 ถนนพหลโยธิน ตำบลคลองหนึ่ง<br />
              อำเภอคลองหลวง จังหวัดปทุมธานี 12120<br />
              E-mail : <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
            </strong>
          </p>
        </div>
        {product && (
          <a className="site-contact-inquiry" href={mailto}>
            {lang === 'th' ? 'ส่งอีเมลสอบถาม' : 'Email an inquiry about'} {product}
            {sku ? ` (${sku})` : ''}
          </a>
        )}
        <iframe
          className="site-contact-map"
          title="Dou Yee Thailand location"
          loading="lazy"
          src={`https://maps.google.com/maps?q=${encodeURIComponent(MAP_QUERY)}&t=k&z=16&output=embed`}
        />
      </div>
    </div>
  );
};

export default ContactView;
