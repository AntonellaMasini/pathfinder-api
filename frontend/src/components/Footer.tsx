import { HeartDoodle, StarDoodle } from "./Doodles";

const Footer = () => {
  return (
    <footer className="relative py-12 px-4 border-t border-foreground/10">
      <div className="max-w-4xl mx-auto text-center">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <StarDoodle className="w-6 h-6 text-primary" />
          <span className="text-xl font-display font-semibold gradient-text">
            Pathfinder
          </span>
        </div>

        {/* Tagline */}
        <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
          Helping curious people make sense of their experiences and explore what's possible.
        </p>

        {/* Made with love */}
        <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
          Made with 
          <HeartDoodle className="w-4 h-4 text-secondary mx-1" />
          for the uncertain
        </div>

        {/* Year */}
        <p className="text-xs text-muted-foreground/60 mt-4">
          © 2026 Pathfinder. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
