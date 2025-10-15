import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const JobPage = () => {
  const [activeStep, setActiveStep] = useState(0);

  const jobSteps = [
    {
      id: 'estimate',
      title: 'Estimate',
      status: 'completed',
      component: <EstimateStep />
    },
    {
      id: 'approval',
      title: 'Approval',
      status: 'completed',
      component: <ApprovalStep />
    },
    {
      id: 'contract',
      title: 'Contract',
      status: 'active',
      component: <ContractStep />
    },
    {
      id: 'measurement',
      title: 'Measurement',
      status: 'pending',
      component: <MeasurementStep />
    },
    {
      id: 'fabrication',
      title: 'Fabrication',
      status: 'pending',
      component: <FabricationStep />
    },
    {
      id: 'installation',
      title: 'Installation',
      status: 'pending',
      component: <InstallationStep />
    },
    {
      id: 'completion',
      title: 'Completion',
      status: 'pending',
      component: <CompletionStep />
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-gray-100 text-gray-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>Job</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Job Flow</h1>
      </div>

      {/* Job Flow Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Job Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 overflow-x-auto pb-4">
            {jobSteps.map((step, index) => (
              <div key={step.id} className="flex items-center gap-4 min-w-0 flex-shrink-0">
                {/* Step Circle */}
                <div className="flex flex-col items-center gap-2">
                  <div 
                    className={`w-12 h-12 rounded-full flex items-center justify-center cursor-pointer transition-all ${
                      step.status === 'completed' ? 'bg-green-500 text-white' :
                      step.status === 'active' ? 'bg-blue-500 text-white' :
                      'bg-gray-200 text-gray-600'
                    }`}
                    onClick={() => setActiveStep(index)}
                  >
                    {step.status === 'completed' ? (
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <span className="text-sm font-semibold">{index + 1}</span>
                    )}
                  </div>
                  <span className="text-xs font-medium text-gray-700">{step.title}</span>
                  <Badge className={`text-xs ${getStatusColor(step.status)}`}>
                    {step.status}
                  </Badge>
                </div>

                {/* Connector Line */}
                {index < jobSteps.length - 1 && (
                  <div className={`w-8 h-0.5 ${
                    jobSteps[index + 1].status === 'pending' ? 'bg-gray-200' : 'bg-green-500'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Active Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>{jobSteps[activeStep].title} Details</CardTitle>
        </CardHeader>
        <CardContent>
          {jobSteps[activeStep].component}
        </CardContent>
      </Card>
    </div>
  );
};

// Individual Step Components
const EstimateStep = () => (
  <div className="space-y-4">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Customer Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700">Customer Name</label>
            <p className="text-sm text-gray-900">John Smith</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Contact</label>
            <p className="text-sm text-gray-900">john@email.com | (555) 123-4567</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Address</label>
            <p className="text-sm text-gray-900">123 Main St, City, State 12345</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Project Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700">Project Type</label>
            <p className="text-sm text-gray-900">Kitchen Countertop</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Material</label>
            <p className="text-sm text-gray-900">Granite - Absolute Black</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Estimated Square Feet</label>
            <p className="text-sm text-gray-900">45 sq ft</p>
          </div>
        </CardContent>
      </Card>
    </div>

    <div className="flex justify-end gap-3">
      <Button variant="outline">Edit Estimate</Button>
      <Button className="bg-green-600 hover:bg-green-700">Approve Estimate</Button>
    </div>
  </div>
);

const ApprovalStep = () => (
  <div className="space-y-4">
    <Card className="bg-green-50 border-green-200">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-green-800">Estimate Approved</h3>
            <p className="text-sm text-green-700">Approved by Manager on Mar 15, 2025</p>
          </div>
        </div>
      </CardContent>
    </Card>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Approval Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700">Approved By</label>
            <p className="text-sm text-gray-900">Sarah Johnson (Manager)</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Approval Date</label>
            <p className="text-sm text-gray-900">March 15, 2025</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Total Amount</label>
            <p className="text-sm text-gray-900 font-semibold">$4,500.00</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Next Steps</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-sm text-gray-700">Prepare contract documents</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
            <span className="text-sm text-gray-500">Schedule customer meeting</span>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
);

const ContractStep = () => (
  <div className="space-y-4">
    <Tabs defaultValue="contract" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="contract">Contract</TabsTrigger>
        <TabsTrigger value="terms">Terms</TabsTrigger>
        <TabsTrigger value="payment">Payment</TabsTrigger>
      </TabsList>

      <TabsContent value="contract" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Contract Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Contract Number</label>
                <p className="text-sm text-gray-900">CON-2025-001</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Start Date</label>
                <p className="text-sm text-gray-900">March 20, 2025</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Expected Completion</label>
                <p className="text-sm text-gray-900">April 15, 2025</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Status</label>
                <Badge className="bg-blue-100 text-blue-800">Draft</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="terms" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Terms & Conditions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900">Warranty</h4>
                <p className="text-sm text-gray-600">10-year warranty on materials and workmanship</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Payment Terms</h4>
                <p className="text-sm text-gray-600">50% deposit, 50% upon completion</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Change Orders</h4>
                <p className="text-sm text-gray-600">Any changes require written approval and may affect timeline and cost</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="payment" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Payment Schedule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Deposit (50%)</p>
                  <p className="text-sm text-gray-600">Due upon contract signing</p>
                </div>
                <p className="font-semibold text-gray-900">$2,250.00</p>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Final Payment (50%)</p>
                  <p className="text-sm text-gray-600">Due upon project completion</p>
                </div>
                <p className="font-semibold text-gray-900">$2,250.00</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>

    <div className="flex justify-end gap-3">
      <Button variant="outline">Save Draft</Button>
      <Button className="bg-green-600 hover:bg-green-700">Send to Customer</Button>
    </div>
  </div>
);

const MeasurementStep = () => (
  <div className="space-y-4">
    <Card>
      <CardHeader>
        <CardTitle>Measurement Schedule</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Scheduled Date</label>
            <p className="text-sm text-gray-900">March 22, 2025</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Scheduled Time</label>
            <p className="text-sm text-gray-900">10:00 AM - 12:00 PM</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Technician</label>
            <p className="text-sm text-gray-900">Mike Rodriguez</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Status</label>
            <Badge className="bg-gray-100 text-gray-600">Scheduled</Badge>
          </div>
        </div>
      </CardContent>
    </Card>

    <div className="flex justify-end gap-3">
      <Button variant="outline">Reschedule</Button>
      <Button className="bg-blue-600 hover:bg-blue-700">Confirm Appointment</Button>
    </div>
  </div>
);

const FabricationStep = () => (
  <div className="space-y-4">
    <Card>
      <CardHeader>
        <CardTitle>Fabrication Progress</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="font-medium text-gray-900">Material Ordered</span>
            </div>
            <span className="text-sm text-gray-600">Completed</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">2</span>
              </div>
              <span className="font-medium text-gray-900">Cutting & Shaping</span>
            </div>
            <span className="text-sm text-gray-600">In Progress</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-gray-600 text-sm font-bold">3</span>
              </div>
              <span className="font-medium text-gray-900">Polishing & Finishing</span>
            </div>
            <span className="text-sm text-gray-600">Pending</span>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
);

const InstallationStep = () => (
  <div className="space-y-4">
    <Card>
      <CardHeader>
        <CardTitle>Installation Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Installation Date</label>
            <p className="text-sm text-gray-900">April 10, 2025</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Installation Time</label>
            <p className="text-sm text-gray-900">8:00 AM - 4:00 PM</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Installation Team</label>
            <p className="text-sm text-gray-900">Team Alpha (3 members)</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Equipment Needed</label>
            <p className="text-sm text-gray-900">Crane, Lifting Equipment</p>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
);

const CompletionStep = () => (
  <div className="space-y-4">
    <Card className="bg-green-50 border-green-200">
      <CardContent className="p-6 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-green-800 mb-2">Project Completed Successfully</h3>
        <p className="text-sm text-green-700 mb-4">
          All work has been completed and the customer has signed off on the project.
        </p>
        <div className="flex justify-center gap-3">
          <Button variant="outline">View Final Invoice</Button>
          <Button className="bg-green-600 hover:bg-green-700">Generate Invoice</Button>
        </div>
      </CardContent>
    </Card>
  </div>
);

export { JobPage };
