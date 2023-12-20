import QRCode from 'qrcode';

export const generateQRCode = async (url: string) => {
  const qrCode = QRCode.toBuffer(url, {
    errorCorrectionLevel: 'H',
    type: 'png',
    color: {
      dark: '#000',
      light: '#fff',
    },
  });

  return qrCode;
};
