import { EllipsisVertical, Building, Building2, Building2Icon, BuildingIcon, Ellipsis } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardFooter } from "@/components/ui/card";
import { RiBuilding2Fill, RiBuildingLine } from "@remixicon/react";
import { toAbsoluteUrl } from "@/lib/helpers";
import { AvatarGroup } from "@/partials/common/avatar-group";
import { Role } from "@/config/types";
import { IEmployee } from "@/pages/employers/components/employer";
import { DropdownMenu5 } from "./components/dropdown-menu-5";

export interface Member {
    //   name?: string;
    //   email?: string;
    //   avatar?: string;
    filename?: string;
    variant?: string;
    fallback?: string;
}

export interface Department {
    id: number;
    name: string;
    description: string;
    members: Member[];
    extraMembers?: number;
    users?: IEmployee[]
}

export const departments: Department[] = [
    {
        id: 1,
        name: "CAD PROGRAMMING",
        description: "Drafting designs, final CAD programming for new projects",
        members: [
            { filename: '300-2.png', variant: 'size-8' },
            { filename: '300-2.png', variant: 'size-8' },
            { filename: '300-2.png', variant: 'size-8' },
            { filename: '300-2.png', variant: 'size-8' },
            // {
            //     fallback: '+16',
            //     variant: 'text-primary-foreground size-8 ring-background bg-green-500',
            // },
        ],
        extraMembers: 3,
        users: [
            {
                id: 1,
                name: 'Cameron Williamson',
                email: 'tim.jennings@example.com',
                address: '8502 Preston Rd. Inglewood, Maine 98380',
                department: 'Sales',
                phone: '(704) 555-0113',
                role: 'Sales',
                status: 'Active',
            },
            {
                id: 2,
                name: 'Esther Howard',
                email: 'willie.jennings@example.com',
                address: '2715 Ash Dr. San Jose, South Dakota 83475',
                department: 'Front office',
                phone: '(704) 555-0112',
                role: 'Front office',
                status: 'Deactivated',
            },
            {
                id: 3,
                name: 'Leslie Alexander',
                email: 'michelle.rivera@example.com',
                address: '4140 Parker Rd. Allentown, New Mexico 31134',
                department: 'CAD',
                phone: '(684) 555-0108',
                role: 'CAD',
                status: 'Deactivated',
            },
            {
                id: 4,
                name: 'Jenny Wilson',
                email: 'deanna.curtis@example.com',
                address: '4140 Parker Rd. Allentown, New Mexico 31134',
                department: 'Warehouse',
                phone: '(704) 555-0120',
                role: 'Warehouse',
                status: 'Active',
            },
            {
                id: 5,
                name: 'Darlene Robertson',
                email: 'felicia.reid@example.com',
                address: '2972 Westheimer Rd. Santa Ana, Illinois 85486',
                department: 'Production',
                phone: '(480) 555-0121',
                role: 'Production',
                status: 'Deactivated',
            },
        ]
    },
    {
        id: 2,
        name: "FRONT OFFICE",
        description:
            "Create template for new projects, coordinate installations and purchases.",
        members: [
            { filename: "300-2.png", variant: "size-8" },
            { filename: "300-2.png", variant: "size-8" },
            { filename: "300-2.png", variant: "size-8" },
            {
                fallback: "+16",
                variant: "text-primary-foreground size-8 ring-background bg-green-500",
            },
        ],
        users: [
            {
                id: 1,
                name: 'Cameron Williamson',
                email: 'tim.jennings@example.com',
                address: '8502 Preston Rd. Inglewood, Maine 98380',
                department: 'Sales',
                phone: '(704) 555-0113',
                role: 'Sales',
                status: 'Active',
            },
            {
                id: 2,
                name: 'Esther Howard',
                email: 'willie.jennings@example.com',
                address: '2715 Ash Dr. San Jose, South Dakota 83475',
                department: 'Front office',
                phone: '(704) 555-0112',
                role: 'Front office',
                status: 'Deactivated',
            },
            {
                id: 3,
                name: 'Leslie Alexander',
                email: 'michelle.rivera@example.com',
                address: '4140 Parker Rd. Allentown, New Mexico 31134',
                department: 'CAD',
                phone: '(684) 555-0108',
                role: 'CAD',
                status: 'Deactivated',
            },
            {
                id: 4,
                name: 'Jenny Wilson',
                email: 'deanna.curtis@example.com',
                address: '4140 Parker Rd. Allentown, New Mexico 31134',
                department: 'Warehouse',
                phone: '(704) 555-0120',
                role: 'Warehouse',
                status: 'Active',
            },
            {
                id: 5,
                name: 'Darlene Robertson',
                email: 'felicia.reid@example.com',
                address: '2972 Westheimer Rd. Santa Ana, Illinois 85486',
                department: 'Production',
                phone: '(480) 555-0121',
                role: 'Production',
                status: 'Deactivated',
            },
        ]
    },
    {
        id: 3,
        name: "SALES DEPARTMENT",
        description:
            "Oversees all new clients and projects on behalf of the company.",
        members: [
            { filename: "300-2.png", variant: "size-8" },
            { filename: "300-2.png", variant: "size-8" },
            { filename: "300-2.png", variant: "size-8" },
            { filename: "300-2.png", variant: "size-8" },
            {
                fallback: "+16",
                variant: "text-primary-foreground size-8 ring-background bg-green-500",
            },
        ],
        users: [
            {
                id: 1,
                name: 'Cameron Williamson',
                email: 'tim.jennings@example.com',
                address: '8502 Preston Rd. Inglewood, Maine 98380',
                department: 'Sales',
                phone: '(704) 555-0113',
                role: 'Sales',
                status: 'Active',
            },
            {
                id: 2,
                name: 'Esther Howard',
                email: 'willie.jennings@example.com',
                address: '2715 Ash Dr. San Jose, South Dakota 83475',
                department: 'Front office',
                phone: '(704) 555-0112',
                role: 'Front office',
                status: 'Deactivated',
            },
            {
                id: 3,
                name: 'Leslie Alexander',
                email: 'michelle.rivera@example.com',
                address: '4140 Parker Rd. Allentown, New Mexico 31134',
                department: 'CAD',
                phone: '(684) 555-0108',
                role: 'CAD',
                status: 'Deactivated',
            },
            {
                id: 4,
                name: 'Jenny Wilson',
                email: 'deanna.curtis@example.com',
                address: '4140 Parker Rd. Allentown, New Mexico 31134',
                department: 'Warehouse',
                phone: '(704) 555-0120',
                role: 'Warehouse',
                status: 'Active',
            },
            {
                id: 5,
                name: 'Darlene Robertson',
                email: 'felicia.reid@example.com',
                address: '2972 Westheimer Rd. Santa Ana, Illinois 85486',
                department: 'Production',
                phone: '(480) 555-0121',
                role: 'Production',
                status: 'Deactivated',
            },
        ]
    },
    {
        id: 4,
        name: "PRODUCTION",
        description: "Can create, edit, and delete all user accounts. Assign...",
        members: [
            { filename: "300-2.png", variant: "size-8" },
            { filename: "300-2.png", variant: "size-8" },
            { filename: "300-2.png", variant: "size-8" },
            {
                fallback: "+16",
                variant: "text-primary-foreground size-8 ring-background bg-green-500",
            },
        ],
    },
    {
        id: 5,
        name: "WARE HOUSE",
        description: "Keeps all material inventories and purchases.",
        members: [
            { filename: '300-2.png', variant: 'size-8' },
            { filename: '300-2.png', variant: 'size-8' },
            { filename: '300-2.png', variant: 'size-8' },
            {
                fallback: '+16',
                variant: 'text-primary-foreground size-8 ring-background bg-green-500',
            },
        ],
        extraMembers: 0,
    },
    {
        id: 6,
        name: "INSTALLATION",
        description: "Can create, edit, and delete all user accounts. Assign...",
        members: [
            { filename: "300-4.png", variant: "size-8" },
            { filename: "300-1.png", variant: "size-8" },
            { filename: "300-2.png", variant: "size-8" },
            {
                fallback: "+16",
                variant: "text-primary-foreground size-8 ring-background bg-green-500",
            },
        ],
    },
];

const DepartmentCard = () => {
    const navigate = useNavigate();

    interface HandleViewParams {
        id: number;
        name: string;
        description: string;
        members: Member[];
        extraMembers?: number;
        users?: IEmployee[];
    }

    const handleView = (department: HandleViewParams) => {
        navigate(`/departments/${department.id}`, { state: { department } });
    };
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {departments.map((dept) => (
                <Card key={dept.id} className="flex flex-col gap-3 ">
                    <div className="flex items-start justify-between gap-1 p-4">
                        <div className="space-y-2 ">
                            <img
                                src={toAbsoluteUrl('/images/icons/department.svg')}
                                className=" bg-[#E6E9E7] rounded-full p-2 size-[36px] mb-3"
                                alt="image"
                            />
                            <div className="flex flex-col">
                                <Link
                                    to={`/departments/${dept.id}`}
                                    className="text-base font-medium text-text hover:text-primary-active mb-px"
                                    state={{ department: dept }}
                                >
                                    {dept.name}
                                </Link>

                            </div>
                            <p className="text-xs text-text-foreground flex-grow">
                                {dept.description}
                            </p>
                        </div>

                        <DropdownMenu5
                            trigger={
                                <Button variant="ghost" mode="icon">
                                    <Ellipsis />
                                </Button>
                            }
                            onView={() => handleView(dept)}
                            // dept={dept}
                        />
                    </div>
                    <CardFooter className="p-4  flex-col items-start space-y-2">
                        <span className="text-xs text-secondary-foreground uppercase">
                            member(s)
                        </span>
                        <AvatarGroup group={dept.members}

                        />
                    </CardFooter>
                </Card>
            ))}
        </div>
    );
};

export { DepartmentCard };
