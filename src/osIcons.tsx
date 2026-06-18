import type { JSX, ReactNode } from "react";

type IconProps = { size?: number };

function PixelSvg({ children, size = 32 }: IconProps & { children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      height={size}
      shapeRendering="crispEdges"
      viewBox="0 0 32 32"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      {children}
    </svg>
  );
}

export const OS_ICONS: Record<string, (props: IconProps) => JSX.Element> = {
  document: ({ size = 32 }) => (
    <PixelSvg size={size}>
      <rect fill="#000" x="7" y="3" width="16" height="26" />
      <rect fill="#fff" x="8" y="4" width="13" height="24" />
      <rect fill="#c0c0c0" x="21" y="7" width="3" height="21" />
      <rect fill="#808080" x="21" y="4" width="1" height="4" />
      <rect fill="#1084d0" x="11" y="11" width="10" height="2" />
      <rect fill="#808080" x="11" y="16" width="8" height="2" />
      <rect fill="#808080" x="11" y="21" width="10" height="2" />
    </PixelSvg>
  ),
  email: ({ size = 32 }) => (
    <PixelSvg size={size}>
      <rect fill="#000" x="4" y="8" width="24" height="17" />
      <rect fill="#fff" x="5" y="9" width="22" height="15" />
      <rect fill="#c0c0c0" x="6" y="10" width="20" height="13" />
      <rect fill="#000080" x="7" y="11" width="4" height="2" />
      <rect fill="#000080" x="21" y="11" width="4" height="2" />
      <rect fill="#1084d0" x="11" y="13" width="10" height="2" />
      <rect fill="#000080" x="9" y="15" width="3" height="2" />
      <rect fill="#000080" x="20" y="15" width="3" height="2" />
      <rect fill="#000080" x="12" y="17" width="8" height="2" />
    </PixelSvg>
  ),
  law: ({ size = 32 }) => (
    <PixelSvg size={size}>
      <rect fill="#000" x="15" y="5" width="3" height="20" />
      <rect fill="#ffff00" x="13" y="4" width="7" height="3" />
      <rect fill="#c0c0c0" x="9" y="24" width="15" height="3" />
      <rect fill="#000" x="7" y="27" width="19" height="2" />
      <rect fill="#ffff00" x="6" y="9" width="21" height="2" />
      <rect fill="#000" x="8" y="11" width="2" height="7" />
      <rect fill="#000" x="23" y="11" width="2" height="7" />
      <rect fill="#1084d0" x="4" y="18" width="9" height="3" />
      <rect fill="#1084d0" x="20" y="18" width="9" height="3" />
    </PixelSvg>
  ),
  web: ({ size = 32 }) => (
    <PixelSvg size={size}>
      <rect fill="#000" x="8" y="5" width="16" height="22" />
      <rect fill="#1084d0" x="7" y="8" width="18" height="16" />
      <rect fill="#008080" x="10" y="7" width="12" height="18" />
      <rect fill="#fff" x="9" y="15" width="15" height="2" />
      <rect fill="#fff" x="15" y="6" width="2" height="20" />
      <rect fill="#ffff00" x="11" y="10" width="4" height="3" />
      <rect fill="#0a0" x="18" y="18" width="5" height="3" />
    </PixelSvg>
  ),
  files: ({ size = 32 }) => (
    <PixelSvg size={size}>
      <rect fill="#000" x="3" y="9" width="26" height="18" />
      <rect fill="#ffff00" x="4" y="8" width="10" height="4" />
      <rect fill="#ffff00" x="4" y="12" width="24" height="14" />
      <rect fill="#c0c0c0" x="5" y="14" width="22" height="2" />
      <rect fill="#808080" x="5" y="24" width="22" height="1" />
    </PixelSvg>
  ),
  invoice: ({ size = 32 }) => (
    <PixelSvg size={size}>
      <rect fill="#000" x="8" y="4" width="16" height="25" />
      <rect fill="#fff" x="9" y="5" width="14" height="22" />
      <rect fill="#c0c0c0" x="10" y="6" width="3" height="3" />
      <rect fill="#1084d0" x="14" y="7" width="7" height="2" />
      <rect fill="#808080" x="11" y="13" width="10" height="2" />
      <rect fill="#808080" x="11" y="18" width="7" height="2" />
      <rect fill="#a00" x="18" y="22" width="3" height="3" />
    </PixelSvg>
  ),
  explorer: ({ size = 32 }) => (
    <PixelSvg size={size}>
      <rect fill="#000" x="3" y="11" width="26" height="16" />
      <rect fill="#ffff00" x="4" y="8" width="10" height="5" />
      <rect fill="#c0c0c0" x="5" y="13" width="19" height="3" />
      <rect fill="#ffff00" x="4" y="16" width="24" height="10" />
      <rect fill="#808080" x="8" y="19" width="16" height="2" />
    </PixelSvg>
  ),
  diagnostics: ({ size = 32 }) => (
    <PixelSvg size={size}>
      <rect fill="#000" x="5" y="6" width="22" height="20" />
      <rect fill="#c0c0c0" x="6" y="7" width="20" height="18" />
      <rect fill="#fff" x="8" y="9" width="16" height="10" />
      <rect fill="#0a0" x="9" y="14" width="4" height="2" />
      <rect fill="#0a0" x="13" y="12" width="2" height="4" />
      <rect fill="#a00" x="15" y="16" width="2" height="2" />
      <rect fill="#0a0" x="17" y="11" width="2" height="7" />
      <rect fill="#0a0" x="19" y="14" width="4" height="2" />
      <rect fill="#000080" x="10" y="21" width="12" height="2" />
    </PixelSvg>
  ),
  calendar: ({ size = 32 }) => (
    <PixelSvg size={size}>
      <rect fill="#000" x="5" y="5" width="22" height="24" />
      <rect fill="#fff" x="6" y="6" width="20" height="22" />
      <rect fill="#000080" x="6" y="6" width="20" height="6" />
      <rect fill="#ffff00" x="10" y="3" width="3" height="6" />
      <rect fill="#ffff00" x="20" y="3" width="3" height="6" />
      <rect fill="#c0c0c0" x="9" y="15" width="4" height="3" />
      <rect fill="#c0c0c0" x="15" y="15" width="4" height="3" />
      <rect fill="#a00" x="21" y="15" width="3" height="3" />
      <rect fill="#c0c0c0" x="9" y="21" width="4" height="3" />
      <rect fill="#0a0" x="15" y="21" width="4" height="3" />
    </PixelSvg>
  ),
  clients: ({ size = 32 }) => (
    <PixelSvg size={size}>
      <rect fill="#000" x="8" y="5" width="7" height="7" />
      <rect fill="#ffff00" x="9" y="6" width="5" height="5" />
      <rect fill="#000080" x="6" y="14" width="11" height="11" />
      <rect fill="#000" x="18" y="7" width="7" height="7" />
      <rect fill="#ffff00" x="19" y="8" width="5" height="5" />
      <rect fill="#1084d0" x="16" y="16" width="11" height="10" />
      <rect fill="#fff" x="10" y="16" width="3" height="2" />
      <rect fill="#fff" x="20" y="18" width="3" height="2" />
    </PixelSvg>
  ),
  whatsapp: ({ size = 32 }) => (
    <PixelSvg size={size}>
      <rect fill="#000" x="5" y="6" width="22" height="17" />
      <rect fill="#0a0" x="6" y="7" width="20" height="15" />
      <rect fill="#0a0" x="9" y="22" width="5" height="4" />
      <rect fill="#fff" x="12" y="11" width="4" height="3" />
      <rect fill="#fff" x="10" y="14" width="3" height="5" />
      <rect fill="#fff" x="16" y="18" width="5" height="3" />
      <rect fill="#000" x="13" y="12" width="2" height="2" />
      <rect fill="#000" x="17" y="18" width="2" height="2" />
    </PixelSvg>
  ),
  database: ({ size = 32 }) => (
    <PixelSvg size={size}>
      <rect fill="#000" x="7" y="6" width="18" height="22" />
      <rect fill="#1084d0" x="8" y="6" width="16" height="5" />
      <rect fill="#fff" x="10" y="7" width="12" height="2" />
      <rect fill="#008080" x="8" y="11" width="16" height="6" />
      <rect fill="#fff" x="10" y="13" width="12" height="1" />
      <rect fill="#008080" x="8" y="17" width="16" height="6" />
      <rect fill="#fff" x="10" y="19" width="12" height="1" />
      <rect fill="#008080" x="8" y="23" width="16" height="4" />
    </PixelSvg>
  ),
};
