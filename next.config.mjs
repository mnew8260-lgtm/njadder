/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // ملاحظة: telegram أُزيل من serverExternalPackages لأنه يسبب مشكلة "Only StringSession
  // and StoreSessions are supported currently :(" — حيث يحمّل نسختين منفصلتين من GramJS
  // فيفشل فحص instanceof Session داخل telegramBaseClient.js. باقي الحزم آمنة للإبقاء.
  serverExternalPackages: ["postgres", "bcryptjs", "jose"],
};
export default nextConfig;
