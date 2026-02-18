import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  User, 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Edit3,
  Scissors,
  Settings,
  ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router';

interface WorkflowStage {
  id: string;
  name: string;
  status: 'completed' | 'in-progress' | 'pending' | 'not-started';
  date?: string;
  assignedTo?: string;
  notes?: string;
  route?: string; // Route to navigate to for this stage
}

interface WorkflowStagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  fabId: string;
  jobName: string;
}

// Mock data for workflow stages based on the FABRICATION WORKFLOW document
const getWorkflowStages = (): WorkflowStage[] => [
  {
    id: '1',
    name: 'FAB ID Creation',
    status: 'completed',
    date: '2025-11-15',
    assignedTo: 'Production Coordinator',
    notes: 'Standard fabrication request created',
    route: '/jobs/fab-creation'
  },
  {
    id: '2',
    name: 'Templating',
    status: 'completed',
    date: '2025-11-16',
    assignedTo: 'Templater Technician',
    notes: 'Template completed with actual square footage',
    route: '/job/templating'
  },
  {
    id: '3',
    name: 'Pre-Draft Review',
    status: 'completed',
    date: '2025-11-16',
    assignedTo: 'Production Coordinator',
    notes: 'All documents reviewed and approved',
    route: '/job/predraft'
  },
  {
    id: '4',
    name: 'Drafting (CAD)',
    status: 'in-progress',
    date: '2025-11-17',
    assignedTo: 'CAD Drafter',
    notes: 'Drafting in progress, 75% complete',
    route: '/jobs/drafting'
  },
  {
    id: '5',
    name: 'Sales Check',
    status: 'pending',
    assignedTo: 'Salesperson',
    notes: 'Awaiting sales approval',
    route: '/job/sales-check'
  },
  {
    id: '6',
    name: 'Revision Queue',
    status: 'not-started',
    notes: 'Only if revision requested',
    route: '/jobs/revisions'
  },
  {
    id: '7',
    name: 'Cut List Scheduling',
    status: 'not-started',
    notes: 'After sales approval',
    route: '/jobs/cut-list'
  },
  {
    id: '8',
    name: 'Final Programming',
    status: 'not-started',
    notes: 'CNC file processing',
    route: '/jobs/final-programming'
  },
  {
    id: '9',
    name: 'Shop Planning',
    status: 'not-started',
    notes: 'Final preparation before fabrication',
    route: '/jobs/shop-planning'
  }
];

const getStatusIcon = (status: WorkflowStage['status']) => {
  switch (status) {
    case 'completed':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'in-progress':
      return <Clock className="h-4 w-4 text-blue-500" />;
    case 'pending':
      return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    case 'not-started':
      return <div className="h-4 w-4 rounded-full border border-gray-300" />;
    default:
      return null;
  }
};

const getStatusBadge = (status: WorkflowStage['status']) => {
  switch (status) {
    case 'completed':
      return <Badge variant="success">Completed</Badge>;
    case 'in-progress':
      return <Badge variant="primary">In Progress</Badge>;
    case 'pending':
      return <Badge variant="warning">Pending</Badge>;
    case 'not-started':
      return <Badge variant="outline">Not Started</Badge>;
    default:
      return <Badge variant="outline">Unknown</Badge>;
  }
};

export function WorkflowStagesModal({ isOpen, onClose, fabId, jobName }: WorkflowStagesModalProps) {
  const stages = getWorkflowStages();
  const navigate = useNavigate();

  const handleStageClick = (route: string | undefined) => {
    if (route) {
      navigate(route);
      onClose(); // Close the modal after navigation
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Workflow Stages for FAB ID: {fabId}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">Job: {jobName}</p>
        </DialogHeader>
        
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-4">
            {stages.map((stage) => (
              <div 
                key={stage.id} 
                className={`flex items-start gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer ${
                  stage.route ? 'hover:shadow-md' : ''
                }`}
                onClick={() => handleStageClick(stage.route)}
              >
                <div className="mt-1">
                  {getStatusIcon(stage.status)}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">{stage.name}</h3>
                    {getStatusBadge(stage.status)}
                  </div>
                  
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                    {stage.date && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{stage.date}</span>
                      </div>
                    )}
                    
                    {stage.assignedTo && (
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        <span>{stage.assignedTo}</span>
                      </div>
                    )}
                    
                    {stage.notes && (
                      <div className="flex items-start gap-1 md:col-span-2">
                        <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>{stage.notes}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {stage.route && (
                  <div className="self-center">
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}