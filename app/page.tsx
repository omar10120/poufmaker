'use client';

import dynamic from 'next/dynamic';
import 'swagger-ui-react/swagger-ui.css';

const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false });

export default function Home() {
  const spec = {
    openapi: '3.0.0',
    info: {
      title: 'Poufmaker API',
      version: '1.0.0',
      description: 'API documentation for Poufmaker'
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ],
    paths: {
      '/api/auth/register': {
        post: {
          tags: ['Auth'],
          summary: 'Register a new user',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password', 'fullName'],
                  properties: {
                    email: {
                      type: 'string',
                      format: 'email'
                    },
                    password: {
                      type: 'string',
                      minLength: 8
                    },
                    fullName: {
                      type: 'string'
                    },
                    phoneNumber: {
                      type: 'string'
                    }
                  }
                }
              }
            }
          },
          responses: {
            '201': {
              description: 'User registered successfully'
            }
          }
        }
      },
      '/api/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Login user',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: {
                      type: 'string',
                      format: 'email'
                    },
                    password: {
                      type: 'string'
                    }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Login successful',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      token: {
                        type: 'string'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/auth/request-reset': {
        post: {
          tags: ['Auth'],
          summary: 'Request a password reset',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email'],
                  properties: {
                    email: {
                      type: 'string',
                      format: 'email'
                    }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Reset email sent successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'Password reset instructions sent to your email'
                      }
                    }
                  }
                }
              }
            },
            '400': {
              description: 'Bad request - email is required'
            },
            '404': {
              description: 'User not found'
            }
          }
        }
      },
      '/api/auth/reset-password': {
        post: {
          tags: ['Auth'],
          summary: 'Reset password using reset token',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['token', 'newPassword'],
                  properties: {
                    token: {
                      type: 'string',
                      description: 'Reset token received via email'
                    },
                    newPassword: {
                      type: 'string',
                      minLength: 8,
                      description: 'New password (minimum 8 characters)'
                    }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Password reset successful'
            },
            '400': {
              description: 'Invalid request or expired token'
            },
            '404': {
              description: 'User not found'
            }
          }
        }
      },
      '/api/products': {
        get: {
          tags: ['Products'],
          summary: 'Get all products',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'List of products',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        Id: { type: 'string' },
                        name: { type: 'string' },
                        description: { type: 'string' },
                        price: { type: 'number' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        post: {
          tags: ['Products'],
          summary: 'Create a new product',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'price'],
                  properties: {
                    name: { type: 'string' },
                    description: { type: 'string' },
                    price: { type: 'number' }
                  }
                }
              }
            }
          },
          responses: {
            '201': {
              description: 'Product created successfully'
            }
          }
        }
      },
      '/api/conversations': {
        get: {
          tags: ['Conversations'],
          summary: 'Get all conversations',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'userId',
              in: 'query',
              schema: {
                type: 'string'
              },
              description: 'Filter by user ID'
            }
          ],
          responses: {
            '200': {
              description: 'List of conversations',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        Id: { type: 'string' },
                        userId: { type: 'string', nullable: true },
                        userName: { type: 'string', nullable: true },
                        userPhone: { type: 'string', nullable: true },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                        messages: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              Id: { type: 'string' },
                              content: { type: 'string' },
                              isUser: { type: 'boolean' },
                              createdAt: { type: 'string', format: 'date-time' }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        post: {
          tags: ['Conversations'],
          summary: 'Create a new conversation',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['initialMessage'],
                  properties: {
                    userName: { type: 'string' },
                    userPhone: { type: 'string' },
                    initialMessage: { type: 'string' }
                  }
                }
              }
            }
          },
          responses: {
            '201': {
              description: 'Conversation created successfully'
            }
          }
        }
      },
      '/api/conversations/{id}': {
        get: {
          tags: ['Conversations'],
          summary: 'Get a conversation by ID',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: {
                type: 'string'
              }
            }
          ],
          responses: {
            '200': {
              description: 'Conversation details'
            },
            '404': {
              description: 'Conversation not found'
            }
          }
        },
        delete: {
          tags: ['Conversations'],
          summary: 'Delete a conversation',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: {
                type: 'string'
              }
            }
          ],
          responses: {
            '200': {
              description: 'Conversation deleted successfully'
            },
            '401': {
              description: 'Unauthorized'
            },
            '404': {
              description: 'Conversation not found'
            }
          }
        }
      },
      '/api/conversations/{id}/messages': {
        get: {
          tags: ['Messages'],
          summary: 'Get messages in a conversation',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: {
                type: 'string'
              }
            },
            {
              name: 'limit',
              in: 'query',
              schema: {
                type: 'integer',
                default: 50
              }
            },
            {
              name: 'before',
              in: 'query',
              schema: {
                type: 'string',
                format: 'date-time'
              }
            }
          ],
          responses: {
            '200': {
              description: 'List of messages'
            },
            '404': {
              description: 'Conversation not found'
            }
          }
        },
        post: {
          tags: ['Messages'],
          summary: 'Add a message to a conversation',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: {
                type: 'string'
              }
            }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['content'],
                  properties: {
                    content: { type: 'string' },
                    isUser: { type: 'boolean', default: true }
                  }
                }
              }
            }
          },
          responses: {
            '201': {
              description: 'Message created successfully'
            },
            '400': {
              description: 'Bad request - missing content'
            },
            '404': {
              description: 'Conversation not found'
            }
          }
        }
      }
    }
  };

  return (
    <div className="container mx-auto p-4">
      <SwaggerUI spec={spec} />
    </div>
  );
}
