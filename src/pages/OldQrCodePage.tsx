import React from 'react';

const OldQrCodePage: React.FC = () => (
  <iframe
    src="/old/qrcode.html"
    title="QR Code 生成工具"
    className="w-full h-[calc(100vh-80px)] border-0"
    loading="lazy"
  />
);

export default OldQrCodePage;
