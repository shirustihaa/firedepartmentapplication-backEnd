const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Fire Department Monitoring System API',
      version: '1.0.0',
      description: 'Real-time monitoring and evaluation system for Fire Department applications, inspections, NOCs, and licensing',
      contact: {
        name: 'Fire Department',
        email: 'info@firedept.gov'
      }
    },
    servers: [
      {
        url: process.env.BACKEND_URL || 'http://localhost:5000',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string' },
            phone: { type: 'string' },
            role: { 
              type: 'string',
              enum: ['citizen', 'admin', 'inspector']
            },
            address: { type: 'object' }
          }
        },
        Application: {
          type: 'object',
          properties: {
            applicationNumber: { type: 'string' },
            applicationType: {
              type: 'string',
              enum: ['fire_inspection', 'noc', 'license', 'renewal']
            },
            status: { type: 'string' },
            propertyDetails: { type: 'object' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        NOC: {
          type: 'object',
          properties: {
            nocNumber: { type: 'string' },
            nocType: { type: 'string' },
            issuedDate: { type: 'string', format: 'date-time' },
            validUntil: { type: 'string', format: 'date-time' },
            status: { type: 'string' }
          }
        },
        License: {
          type: 'object',
          properties: {
            licenseNumber: { type: 'string' },
            licenseType: { type: 'string' },
            validFrom: { type: 'string', format: 'date-time' },
            validUntil: { type: 'string', format: 'date-time' },
            status: { type: 'string' }
          }
        }
      }
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization'
      },
      {
        name: 'Applications',
        description: 'Application management'
      },
      {
        name: 'Inspections',
        description: 'Inspection scheduling and management'
      },
      {
        name: 'NOC',
        description: 'No Objection Certificate management'
      },
      {
        name: 'Licenses',
        description: 'License issuance and management'
      },
      {
        name: 'Reports',
        description: 'Dashboard and reporting'
      }
    ]
  },
  apis: ['./src/routes/*.js']
};

const swaggerSpec = swaggerJsdoc(options);

const setupSwagger = (app) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Fire Department API Documentation'
  }));
};

module.exports = setupSwagger;