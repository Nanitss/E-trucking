import React, { useState } from 'react';
import { 
  ModernForm, 
  FormGroup, 
  ModernInput, 
  ModernSelect, 
  FormActions, 
  ModernButton 
} from '../common/ModernForm';
import { 
  ModernTable, 
  ModernStatusBadge, 
  ModernPagination 
} from '../common/ModernTable';
import { 
  ModernCard,
  ModernStatsCard,
  ModernInfoCard,
  ModernFeatureCard,
  ModernAlertCard,
  ModernLoadingCard,
  ModernEmptyCard
} from '../common/ModernCard';
import { 
  FaTruck, 
  FaUsers, 
  FaBox, 
  FaChartLine,
  FaCheck,
  FaExclamationTriangle,
  FaInfoCircle,
  FaPlus
} from 'react-icons/fa';

/**
 * Design System Example - Showcasing All Components
 * Demonstrates consistent design patterns with your navy blue & yellow theme
 */
const DesignSystemExample = () => {
  const [showAlert, setShowAlert] = useState(true);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Sample data
  const sampleTrucks = [
    {
      id: 1,
      TruckPlate: 'ABC-1234',
      TruckType: 'mini truck',
      TruckCapacity: 2.5,
      TruckBrand: 'Toyota',
      ModelYear: 2023,
      TruckStatus: 'available'
    },
    {
      id: 2,
      TruckPlate: 'XYZ-5678',
      TruckType: '6 wheeler',
      TruckCapacity: 8.0,
      TruckBrand: 'Isuzu',
      ModelYear: 2022,
      TruckStatus: 'on-delivery'
    },
    {
      id: 3,
      TruckPlate: 'DEF-9012',
      TruckType: '4 wheeler',
      TruckCapacity: 4.0,
      TruckBrand: 'Mitsubishi',
      ModelYear: 2021,
      TruckStatus: 'maintenance'
    }
  ];

  const statsData = [
    {
      title: 'Total Trucks',
      value: '24',
      subtitle: 'In fleet',
      icon: <FaTruck className="text-primary" />,
      trend: 'up',
      trendValue: '+12%'
    },
    {
      title: 'Active Deliveries',
      value: '8',
      subtitle: 'In progress',
      icon: <FaBox className="text-success" />,
      trend: 'up',
      trendValue: '+3'
    },
    {
      title: 'Total Clients',
      value: '156',
      subtitle: 'Registered',
      icon: <FaUsers className="text-info" />,
      trend: 'up',
      trendValue: '+5%'
    },
    {
      title: 'Revenue',
      value: '₱45,230',
      subtitle: 'This month',
      icon: <FaChartLine className="text-warning" />,
      trend: 'up',
      trendValue: '+18%'
    }
  ];

  const handleFormSubmit = (e) => {
    e.preventDefault();
    console.log('Form submitted');
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const toggleLoading = () => {
    setLoading(!loading);
  };

  return (
    <div className="container-fluid p-4">
      <div className="row">
        <div className="col-12">
          <h1 className="mb-4">Design System Example</h1>
          <p className="text-muted mb-5">
            This page demonstrates all standardized components using your navy blue and yellow color scheme.
          </p>
        </div>
      </div>

      {/* Alerts Section */}
      <div className="row mb-5">
        <div className="col-12">
          <h2 className="mb-3">Alert Components</h2>
          <div className="row g-3">
            <div className="col-md-6">
              <ModernAlertCard
                title="Success!"
                message="Your truck has been successfully added to the fleet."
                type="success"
                dismissible
                onDismiss={() => setShowAlert(false)}
              />
            </div>
            <div className="col-md-6">
              <ModernAlertCard
                title="Warning"
                message="Some trucks are due for maintenance this week."
                type="warning"
                action={<ModernButton size="sm" variant="warning">View Details</ModernButton>}
              />
            </div>
            <div className="col-md-6">
              <ModernAlertCard
                title="Information"
                message="New features are available in the latest update."
                type="info"
                action={<ModernButton size="sm" variant="info">Learn More</ModernButton>}
              />
            </div>
            <div className="col-md-6">
              <ModernAlertCard
                title="Error"
                message="Failed to load truck data. Please try again."
                type="danger"
                action={<ModernButton size="sm" variant="danger">Retry</ModernButton>}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards Section */}
      <div className="row mb-5">
        <div className="col-12">
          <h2 className="mb-3">Statistics Cards</h2>
          <div className="row g-3">
            {statsData.map((stat, index) => (
              <div key={index} className="col-md-6 col-lg-3">
                <ModernStatsCard
                  title={stat.title}
                  value={stat.value}
                  subtitle={stat.subtitle}
                  icon={stat.icon}
                  trend={stat.trend}
                  trendValue={stat.trendValue}
                  variant={index === 0 ? 'primary' : index === 1 ? 'success' : index === 2 ? 'info' : 'warning'}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form Section */}
      <div className="row mb-5">
        <div className="col-12">
          <h2 className="mb-3">Form Components</h2>
          <ModernForm
            title="Add New Truck"
            subtitle="Enter truck details to add to your fleet"
            onSubmit={handleFormSubmit}
            gridColumns={2}
          >
            <FormGroup
              label="Plate Number"
              required
              help="Enter the vehicle's license plate number"
            >
              <ModernInput
                type="text"
                name="plate"
                placeholder="e.g. ABC-1234"
                required
              />
            </FormGroup>

            <FormGroup
              label="Truck Type"
              required
              help="Select the type of truck"
            >
              <ModernSelect name="type" required>
                <option value="">Select Type</option>
                <option value="mini truck">Mini Truck</option>
                <option value="4 wheeler">4 Wheeler</option>
                <option value="6 wheeler">6 Wheeler</option>
              </ModernSelect>
            </FormGroup>

            <FormGroup
              label="Capacity (tons)"
              required
              help="Enter the maximum load capacity"
            >
              <ModernInput
                type="number"
                name="capacity"
                placeholder="e.g. 2.5"
                min="0.1"
                step="0.1"
                required
              />
            </FormGroup>

            <FormGroup
              label="Brand"
              required
              help="Select the truck manufacturer"
            >
              <ModernSelect name="brand" required>
                <option value="">Select Brand</option>
                <option value="Toyota">Toyota</option>
                <option value="Isuzu">Isuzu</option>
                <option value="Mitsubishi">Mitsubishi</option>
              </ModernSelect>
            </FormGroup>

            <FormActions>
              <ModernButton type="button" variant="secondary">
                Cancel
              </ModernButton>
              <ModernButton type="submit" variant="primary">
                Add Truck
              </ModernButton>
            </FormActions>
          </ModernForm>
        </div>
      </div>

      {/* Table Section */}
      <div className="row mb-5">
        <div className="col-12">
          <h2 className="mb-3">Table Components</h2>
          <ModernTable
            data={sampleTrucks}
            columns={[
              {
                key: 'TruckPlate',
                header: 'Plate Number',
                render: (value) => (
                  <div className="d-flex align-items-center">
                    <FaTruck className="me-2 text-primary" />
                    <span className="font-bold">{value}</span>
                  </div>
                )
              },
              {
                key: 'TruckType',
                header: 'Type',
                render: (value) => <span className="text-capitalize">{value}</span>
              },
              {
                key: 'TruckCapacity',
                header: 'Capacity',
                render: (value) => <span className="font-semibold">{value} tons</span>
              },
              {
                key: 'TruckStatus',
                header: 'Status',
                render: (value) => <ModernStatusBadge status={value} />
              }
            ]}
            title="Truck Fleet"
            subtitle="Manage your truck fleet"
            onAdd={() => console.log('Add truck')}
            onEdit={(truck) => console.log('Edit truck', truck)}
            onDelete={(truck) => console.log('Delete truck', truck)}
          />
        </div>
      </div>

      {/* Feature Cards Section */}
      <div className="row mb-5">
        <div className="col-12">
          <h2 className="mb-3">Feature Cards</h2>
          <div className="row g-4">
            <div className="col-md-6 col-lg-4">
              <ModernFeatureCard
                title="GPS Tracking"
                description="Real-time location tracking for all your trucks"
                icon={<FaTruck className="text-primary" />}
                features={[
                  'Live location updates',
                  'Route optimization',
                  'Delivery notifications',
                  'Historical tracking'
                ]}
                action={<ModernButton size="sm" variant="primary">Learn More</ModernButton>}
                variant="primary"
              />
            </div>
            <div className="col-md-6 col-lg-4">
              <ModernFeatureCard
                title="Fleet Management"
                description="Comprehensive fleet management tools"
                icon={<FaUsers className="text-success" />}
                features={[
                  'Driver management',
                  'Maintenance scheduling',
                  'Fuel tracking',
                  'Performance analytics'
                ]}
                action={<ModernButton size="sm" variant="success">Get Started</ModernButton>}
                variant="success"
              />
            </div>
            <div className="col-md-6 col-lg-4">
              <ModernFeatureCard
                title="Analytics Dashboard"
                description="Advanced analytics and reporting"
                icon={<FaChartLine className="text-warning" />}
                features={[
                  'Performance metrics',
                  'Cost analysis',
                  'Delivery reports',
                  'Custom dashboards'
                ]}
                action={<ModernButton size="sm" variant="warning">View Reports</ModernButton>}
                variant="warning"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Info Cards Section */}
      <div className="row mb-5">
        <div className="col-12">
          <h2 className="mb-3">Info Cards</h2>
          <div className="row g-3">
            <div className="col-md-6">
              <ModernInfoCard
                title="System Status"
                subtitle="All systems operational"
                icon={<FaCheck className="text-success" />}
                value="Online"
                description="All services are running smoothly with 99.9% uptime."
                variant="success"
              />
            </div>
            <div className="col-md-6">
              <ModernInfoCard
                title="Maintenance Alert"
                subtitle="3 trucks due for service"
                icon={<FaExclamationTriangle className="text-warning" />}
                value="Action Required"
                description="Schedule maintenance for trucks ABC-1234, XYZ-5678, and DEF-9012."
                action={<ModernButton size="sm" variant="warning">Schedule Now</ModernButton>}
                variant="warning"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Loading and Empty States */}
      <div className="row mb-5">
        <div className="col-12">
          <h2 className="mb-3">Loading & Empty States</h2>
          <div className="row g-3">
            <div className="col-md-6">
              <ModernLoadingCard message="Loading truck data..." />
            </div>
            <div className="col-md-6">
              <ModernEmptyCard
                title="No Deliveries Found"
                description="There are no deliveries scheduled for today."
                icon="📦"
                action={<ModernButton variant="primary">Create Delivery</ModernButton>}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Pagination Example */}
      <div className="row mb-5">
        <div className="col-12">
          <h2 className="mb-3">Pagination</h2>
          <ModernPagination
            currentPage={currentPage}
            totalPages={10}
            onPageChange={handlePageChange}
            showInfo={true}
          />
        </div>
      </div>

      {/* Button Examples */}
      <div className="row mb-5">
        <div className="col-12">
          <h2 className="mb-3">Button Variants</h2>
          <div className="d-flex flex-wrap gap-3">
            <ModernButton variant="primary">Primary</ModernButton>
            <ModernButton variant="secondary">Secondary</ModernButton>
            <ModernButton variant="accent">Accent</ModernButton>
            <ModernButton variant="success">Success</ModernButton>
            <ModernButton variant="danger">Danger</ModernButton>
            <ModernButton variant="primary" size="sm">Small</ModernButton>
            <ModernButton variant="primary" size="lg">Large</ModernButton>
            <ModernButton variant="primary" disabled>Disabled</ModernButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DesignSystemExample;
