import { SHOP_NAV, workStation } from '@/config/menu.config';
import { Station, ViewMode } from '@/config/types';
import React, { Fragment, useEffect, useState } from 'react'
import { WorkStationForm } from '../components/Form';
import { StationDetailsView } from '../components/Details';
import { PageMenu } from '@/pages/settings/page-menu';
import { Container } from '@/components/common/container';
import { StationList } from '../components/StationList';
import { Toolbar, ToolbarActions, ToolbarBreadcrumbs, ToolbarHeading } from '@/layouts/demo1/components/toolbar';

function SettingsPage() {
    const [viewMode, setViewMode] = useState<ViewMode>('details');
    const [selectedRole, setSelectedRole] = useState<Station | null>(null);
    // workStation
    console.log(workStation, "kkdk")
    useEffect(() => {
        if (workStation.length > 0 && !selectedRole && viewMode !== 'new' && viewMode !== 'edit') {
            setSelectedRole(workStation[0]);
            setViewMode('details');
        }
    }, [selectedRole, viewMode]);
    const handleRoleSelect = (role: Station) => {
        setSelectedRole(role);
        setViewMode('details');
    };

    const handleNewRole = () => {
        setViewMode('new');
        setSelectedRole(null);
    };

    const handleEditRole = (role: Station) => {
        setSelectedRole(role);
        setViewMode('edit');
    };
    const handleCloseForm = () => {
        if (viewMode === 'new') {
            // When closing new mode, go to details of first role
            if (workStation.length > 0) {
                setSelectedRole(workStation[0]);
                setViewMode('details');
            } else {
                setViewMode('list');
            }
        } else if (viewMode === 'edit') {
            // When closing edit mode, go to details of the role being edited
            setViewMode('details');
        }
    };

    const renderRightContent = () => {
        // if (isDeleted) {
        //   return <SuccessMessage message="Role deleted successfully" roleName={selectedRole?.name} />;
        // }

        if (viewMode === 'details' && selectedRole) {
            return <StationDetailsView role={selectedRole} onEdit={handleEditRole} />;
        }

        if (viewMode === 'new' || viewMode === 'edit') {
            return (
                <WorkStationForm
                    mode={viewMode}
                    role={selectedRole}
                    onCancel={handleCloseForm}
                //   onSave={handleSaveRole}
                />
            );
        }

        return (
            <div className="flex items-center justify-center h-64 text-gray-500">
                No roles available. Create a new role to get started.
            </div>
        );
    };
    return (
        <Fragment>
            {/* <PageMenu /> */}

            <Container>
                <Toolbar className=' lex flex-col items-start'>
                    <ToolbarBreadcrumbs
                        menu={SHOP_NAV}
                        rootTitle="Shop"
                        rootPath="/"
                    />

                    <ToolbarHeading title="Shop settings" description="" />


                </Toolbar>
                <div className="flex h-full gap-6 mt-4">
                    <StationList
                        roles={workStation}
                        selectedRole={selectedRole}
                        onRoleSelect={handleRoleSelect}
                        onNewRole={handleNewRole}
                    />

                    {/* Right Content Area */}
                    <div className="flex-1 pl-6">
                        {renderRightContent()}
                    </div>
                </div>
            </Container>
        </Fragment>
    )
}

export default SettingsPage
