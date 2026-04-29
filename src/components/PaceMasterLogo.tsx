import Image from 'next/image';
import logoImage from '../pacemaster-logo.png';

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
