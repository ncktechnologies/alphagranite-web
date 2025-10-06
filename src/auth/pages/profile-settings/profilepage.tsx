
import { Card, CardContent } from '@/components/ui/card';
import { FormHeader } from '@/components/ui/form-header';
import ProfileForm from './form';

export function CompleteProfilePage() {
 
  return (
    <div className="w-full flex flex-col items-center justify-center">
      <FormHeader
        title="Complete your profile setup"
        caption="Kindly fill all the required details about you below"
        width='560'
      />
      <Card className="w-full max-w-[560px] overflow-y-auto border-[#DFDFDF]">
        <CardContent className="px-6 py-12">
         <ProfileForm/>
        </CardContent>
      </Card>
    </div>
  );
}
