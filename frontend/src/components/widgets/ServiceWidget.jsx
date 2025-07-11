import React from 'react';
import useServerStore from '../../store/serverStore';
import Card, { CardBody } from '../common/Card';

const ServiceWidget = () => {
  const services = useServerStore((state) => state.services);

  const handleServiceClick = (url) => {
    window.open(url, '_blank');
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-white">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
        快速访问
      </h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((service, index) => (
          <Card 
            key={index}
            className={`cursor-pointer transition-all duration-200 hover:shadow-xl hover:-translate-y-1 ${
              service.status === 'offline' ? 'opacity-70' : ''
            }`}
            onClick={() => handleServiceClick(service.url)}
          >
            <CardBody className="text-center">
              <div className="flex justify-between items-start mb-3">
                <div className={`text-4xl ${service.status === 'online' ? 'text-primary' : 'text-gray-500'}`}>
                  <i className={service.icon}></i>
                </div>
                <div className={service.status === 'online' ? 'status-online' : 'status-offline'} />
              </div>
              
              <h3 className="font-semibold text-lg mb-2">{service.name}</h3>
              <p className="text-sm text-gray-400">{service.description}</p>
              
              <div className="mt-4 pt-4 border-t border-gray-700">
                <p className="text-xs text-gray-500">{service.url}</p>
              </div>
            </CardBody>
          </Card>
        ))}
        
        {services.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-400">
            <p>暂无配置的服务</p>
            <p className="text-sm mt-2">请在 config.toml 中配置服务信息</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceWidget;