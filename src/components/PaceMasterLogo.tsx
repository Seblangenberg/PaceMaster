import Image from 'next/image';
import logoImage from '../165414C0-8D4A-4244-809A-432CC47631F6.png';

export function PaceMasterLogo({ className, iconClassName }: { className?: string; iconClassName?: string }) {
  return (
    <div className={`flex items-center justify-center h-12 w-12 ${className}`}>
        <Image
          src={logoImage}
          alt="PaceMaster Logo"
          width={48}
          height={48}
          className={`object-contain ${iconClassName}`}
        />
    </div>
  );
}
