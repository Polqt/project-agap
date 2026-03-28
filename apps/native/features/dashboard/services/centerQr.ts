import type { EvacuationCenter } from "@project-agap/api/supabase";

function getCenterTokenValue(center: EvacuationCenter) {
  return center.qr_code_token?.trim() || "No token issued yet.";
}

export function buildCenterQrShareMessage(center: EvacuationCenter) {
  return [
    `Agap check-in token for ${center.name}`,
    `Center address: ${center.address}`,
    `Check-in token: ${getCenterTokenValue(center)}`,
    "Generate or print a QR code from this token so residents can scan it on arrival.",
  ].join("\n\n");
}

export function getCenterQrPreview(center: EvacuationCenter) {
  const token = center.qr_code_token?.trim();

  if (!token) {
    return "Token unavailable";
  }

  if (token.length <= 18) {
    return token;
  }

  return `${token.slice(0, 8)}...${token.slice(-8)}`;
}
