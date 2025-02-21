import Image from 'next/image';

// Define a type for service items
type ServiceItem = {
  title: string;
  description: string;
  icon: string;
  alt: string;
};

// Array of services - easy to add new ones here
const serviceItems: ServiceItem[] = [
  {
    title: "Family Management",
    description: "Add your family and kin into the system to easily manage the distribution of your asset.",
    icon: "/assets/family-logo.png",
    alt: "Family Management"
  },
  {
    title: "Asset Management",
    description: "Add your asset to make the faraid distribution much easier for the court to organize",
    icon: "/assets/asset-logo.png",
    alt: "Asset Management"
  },
  // To add a new service, just add another object here like:
  // {
  //   title: "New Service",
  //   description: "Description of the new service",
  //   icon: "/assets/new-service-icon.png",
  //   alt: "New Service"
  // },
];

const ServiceCard = ({ title, description, icon, alt }: ServiceItem) => (
  <div className="bg-white p-8 rounded-lg shadow-md flex flex-col items-center text-center w-full">
    <div className="w-24 h-24 mb-6 relative">
      <Image
        src={icon}
        alt={alt}
        fill
        objectFit="contain"
      />
    </div>
    <h3 className="text-2xl font-bold mb-4">{title}</h3>
    <p className="text-gray-600">{description}</p>
  </div>
);

const Services = () => {
  // Calculate grid columns based on number of items
  const getGridCols = () => {
    const itemCount = serviceItems.length;
    if (itemCount === 1) return 'grid-cols-1';
    if (itemCount === 2) return 'grid-cols-1 md:grid-cols-2';
    if (itemCount === 3) return 'grid-cols-1 md:grid-cols-3';
    if (itemCount === 4) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4';
    // For 5 or more items, use 2 columns on medium screens and 3 on large screens
    return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
  };

  return (
    <div id="services" className="bg-gray-100 py-20 w-full">
      <div className="w-full px-4">
        <h2 className="text-4xl font-bold text-center mb-16">Services</h2>
        
        <div className={`grid ${getGridCols()} gap-8 w-full px-8`}>
          {serviceItems.map((service, index) => (
            <ServiceCard key={index} {...service} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Services; 