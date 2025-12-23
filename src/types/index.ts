import * as THREE from "three";

// 主题配置类型
export type ThemeKey = "classic" | "frozen" | "midnight";

export interface ThemeColors {
  green: number;
  ornament1: number;
  ornament2: number;
  light: number;
}

export type ThemeConfig = Record<ThemeKey, ThemeColors>;

// 装饰物类型
export type DecorationType =
  | "STAR"
  | "ORNAMENT"
  | "GIFT"
  | "CANE"
  | "PHOTO"
  | "WISH";

export interface DecorationData {
  mesh: THREE.Object3D;
  type: DecorationType;
  basePos: THREE.Vector3;
  photoIndex?: number;
  animating?: boolean;
  startTime?: number;
}

// 树叶粒子数据
export interface FoliageData {
  treePos: THREE.Vector3;
  treeRot: THREE.Euler;
  scatterPos: THREE.Vector3;
  currentPos: THREE.Vector3;
  currentRot: THREE.Euler;
  scale: number;
}

// 场景模式
export enum SceneMode {
  TREE = "TREE",
  SCATTER = "SCATTER",
  FOCUS = "FOCUS",
}
