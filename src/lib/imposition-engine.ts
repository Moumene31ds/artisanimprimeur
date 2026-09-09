// src/lib/imposition-engine.ts
// Industrial Prepress Imposition Engine for Printing Workshops
// Generates ready-to-print SRA3 sheets (320mm x 450mm) with crop marks and color bars

import { jsPDF } from "jspdf";

export interface ImpositionConfig {
  orderId: string;
  customerName: string;
  productType: "carte" | "flyer_a5" | "flyer_a4" | "badge";
  quantity: number;
  itemTitle: string;
  paperFinish?: string;
  designImageUrl?: string;
}

export async function generateSRA3ImpositionPDF(config: ImpositionConfig): Promise<Blob> {
  // SRA3 Dimensions: 320mm width x 450mm height (Portrait)
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [320, 450],
  });

  const SRA3_WIDTH = 320;
  const SRA3_HEIGHT = 450;

  // Background sheet
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, SRA3_WIDTH, SRA3_HEIGHT, "F");

  // --- 1. TOP OPERATOR HEADER ---
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(10, 10, SRA3_WIDTH - 20, 14, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(`ATELIER L'ARTISAN IMPRIMEUR — PLAN D'IMPOSITION INDUSTRIELLE SRA3`, 15, 17);

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.text(
    `COMMANDE : #${config.orderId.slice(-8).toUpperCase()} | CLIENT : ${config.customerName.toUpperCase()} | PRODUIT : ${config.itemTitle.toUpperCase()}`,
    15,
    22
  );

  doc.setFont("helvetica", "bold");
  doc.text(`TIRAGE : ${config.quantity} EX | FINITION : ${(config.paperFinish || "STANDARD MATTE").toUpperCase()}`, 215, 22);

  // --- 2. GRID PARAMETERS BASED ON PRODUCT TYPE ---
  let cols = 3;
  let rows = 7; // 21 business cards (85x55 mm)
  let itemWidth = 85;
  let itemHeight = 55;
  let bleed = 2;

  if (config.productType === "carte") {
    cols = 3;
    rows = 6; // 18 cards spaced comfortably with crop marks
    itemWidth = 85;
    itemHeight = 55;
  } else if (config.productType === "flyer_a5") {
    cols = 2;
    rows = 2; // 4x A5 (148x210 mm)
    itemWidth = 140;
    itemHeight = 195;
  }

  // Centering the grid on the SRA3 sheet
  const gridWidth = cols * itemWidth;
  const gridHeight = rows * itemHeight;
  const startX = (SRA3_WIDTH - gridWidth) / 2;
  const startY = 32 + (SRA3_HEIGHT - 32 - 20 - gridHeight) / 2;

  // Draw items and cutting marks
  doc.setDrawColor(203, 213, 225); // light grey placeholder border
  doc.setLineWidth(0.2);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = startX + c * itemWidth;
      const y = startY + r * itemHeight;

      // Item Box
      doc.setFillColor(248, 250, 252);
      doc.rect(x, y, itemWidth, itemHeight, "FD");

      // Label inside item
      doc.setTextColor(148, 163, 184);
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "normal");
      doc.text(`POSE ${r * cols + c + 1} (${itemWidth}x${itemHeight}mm)`, x + 5, y + 8);
      doc.text(`#${config.orderId.slice(-6).toUpperCase()}`, x + 5, y + itemHeight - 5);

      // Cutting Marks (Traits de coupe) at corners
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.15);

      // Top-Left corner mark
      doc.line(x - 5, y, x - 1, y);
      doc.line(x, y - 5, x, y - 1);

      // Top-Right corner mark
      doc.line(x + itemWidth + 1, y, x + itemWidth + 5, y);
      doc.line(x + itemWidth, y - 5, x + itemWidth, y - 1);

      // Bottom-Left corner mark
      doc.line(x - 5, y + itemHeight, x - 1, y + itemHeight);
      doc.line(x, y + itemHeight + 1, x, y + itemHeight + 5);

      // Bottom-Right corner mark
      doc.line(x + itemWidth + 1, y + itemHeight, x + itemWidth + 5, y + itemHeight);
      doc.line(x + itemWidth, y + itemHeight + 1, x + itemWidth, y + itemHeight + 5);
    }
  }

  // --- 3. REGISTRATION TARGETS (HIRONDELLES DE REPÉRAGE) ---
  const drawRegistrationTarget = (cx: number, cy: number) => {
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.2);
    doc.circle(cx, cy, 3);
    doc.line(cx - 5, cy, cx + 5, cy);
    doc.line(cx, cy - 5, cx, cy + 5);
  };

  drawRegistrationTarget(12, startY + gridHeight / 2);
  drawRegistrationTarget(SRA3_WIDTH - 12, startY + gridHeight / 2);
  drawRegistrationTarget(SRA3_WIDTH / 2, startY - 8);
  drawRegistrationTarget(SRA3_WIDTH / 2, startY + gridHeight + 8);

  // --- 4. CMYK COLOR CALIBRATION CONTROL STRIP ---
  const colorBarY = SRA3_HEIGHT - 16;
  const cmykColors = [
    [0, 255, 255], // Cyan
    [255, 0, 255], // Magenta
    [255, 255, 0], // Yellow
    [0, 0, 0], // Key (Black)
    [0, 128, 255], // 50% Cyan
    [255, 0, 128], // 50% Magenta
    [128, 128, 128], // 50% Grey
  ];

  let cbX = (SRA3_WIDTH - cmykColors.length * 14) / 2;
  cmykColors.forEach(([r, g, b]) => {
    doc.setFillColor(r, g, b);
    doc.rect(cbX, colorBarY, 12, 5, "F");
    cbX += 14;
  });

  return doc.output("blob");
}

export async function downloadSRA3ImpositionPDF(config: ImpositionConfig): Promise<void> {
  const blob = await generateSRA3ImpositionPDF(config);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `IMPOSITION_SRA3_${config.orderId.slice(-6).toUpperCase()}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
