import * as THREE from "three";

export class TextureFactory {
  static createCandyCane(): THREE.CanvasTexture {
    const c = document.createElement("canvas");
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = "#722f37";
    ctx.lineWidth = 30;
    ctx.beginPath();
    for (let i = -128; i < 256; i += 40) {
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 128, 128);
    }
    ctx.stroke();
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }

  static createGift(): THREE.CanvasTexture {
    const c = document.createElement("canvas");
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#722f37";
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = "#d4af37";
    ctx.fillRect(54, 0, 20, 128);
    ctx.fillRect(0, 54, 128, 20);
    return new THREE.CanvasTexture(c);
  }

  static createText(text: string): THREE.CanvasTexture {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 256;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "rgba(20,20,20,0.9)";
    ctx.fillRect(0, 0, 512, 256);
    ctx.strokeStyle = "#d4af37";
    ctx.lineWidth = 8;
    ctx.strokeRect(10, 10, 492, 236);
    ctx.font = 'bold 50px "Cinzel"';
    ctx.fillStyle = "#d4af37";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 256, 128);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
}
