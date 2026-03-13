import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface BackButtonProps {
  fallbackUrl?: string;
  className?: string;
  label?: string;
}

export const BackButton = ({
  fallbackUrl = '/',
  className = '',
  label = 'Back'
}: BackButtonProps) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (window.history.length > 1) {
      navigate(-1); // go back
    } else {
      navigate(fallbackUrl); // fallback
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleClick}
      className={className}
      type="button"
    >
      <ArrowLeft className="mr-2 h-4 w-4" />
      {label}
    </Button>
  );
};