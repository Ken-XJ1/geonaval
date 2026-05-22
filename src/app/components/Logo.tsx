import logoImage from '../../imports/geonaval-logo.jpeg';

interface LogoProps {
  className?: string;
}

export function Logo({ className = "w-10 h-10" }: LogoProps) {
  return (
    <img
      src={logoImage}
      alt="GEONAVAL Logo"
      className={`${className} object-contain rounded-full`}
    />
  );
}

interface LogoFullProps {
  size?: "sm" | "md" | "lg";
}

export function LogoFull({ size = "md" }: LogoFullProps) {
  const sizes = {
    sm: { logo: "w-8 h-8", title: "text-lg", subtitle: "text-xs" },
    md: { logo: "w-10 h-10", title: "text-xl", subtitle: "text-xs" },
    lg: { logo: "w-16 h-16", title: "text-3xl", subtitle: "text-sm" },
  };

  const s = sizes[size];

  return (
    <div className="flex items-center gap-3">
      <img
        src={logoImage}
        alt="GEONAVAL Logo"
        className={`${s.logo} object-contain rounded-full`}
      />
      <div>
        <h1 className={`font-bold text-primary ${s.title}`}>GEONAVAL</h1>
        <p className={`text-muted-foreground ${s.subtitle}`}>Control Fluvial</p>
      </div>
    </div>
  );
}
