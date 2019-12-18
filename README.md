# Fix My Stop API Specification
This API allows users to report issues with bus stops. The two non-user entities are Stops and Issues. Issues are created by Users and are associated with a Stop. Users can create multiple Issues, and Stops can have multiple Issues associated with them.

| **Endpoint** | **Methods\*** |
| --- | --- |
| /stops | POST, GET |
| /stops/:stop\_id | GET, PUT, PATCH, DELETE |
| /issues | POST, GET |
| /issues/:issue\_id | GET, PUT, PATCH, DELETE |
| /stops/:stop\_id/issues | GET |
| /stops/:stop\_id/issues/:issue\_id | PUT, DELETE |
| /users/:user\_id/issues | GET |

<sup>_\* Unsupported methods will return a 405 Method Not Allowed error._</sup>

## Create a stop
Creates a new bus stop.
```
POST /stops
```
### Request
#### Request Parameters
None

#### Request Header
| **Field** | **Description** | **Required?** |
| --- | --- | --- |
| Accept | The format of the content to be returned. Must be **application/json**. | yes |

#### Request Body
Required

#### Request Body Format
JSON

#### Request JSON Attributes
| **Name** | **Type** | **Description** | **Required?** |
| --- | --- | --- | --- |
| name | string | The name of the stop, typically the nearest cross streets | yes |
| lat | float | The latitude coordinate of the bus stop location | yes |
| lon | float | The longitude coordinate of the bus stop location | yes |
| ridership | integer | The average daily ridership at the bus stop | no |

#### Request Body Example
```
{
  "name": "Gilman St & San Pablo Av",
  "lat": 37.8803386,
  "lon": -122.2966763,
  "ridership": 200
}
```

### Response
#### Response Body Format
JSON
#### Response Statuses
| **Outcome** | **Status Code** | **Reason** |
| --- | --- | --- |
| Success | 201 Created |   |
| Failure | 400 Bad Request | The request was missing one or more of the 3 required attributes. |
| Failure | 406 Not Acceptable | Requested content format is not supported or was not provided |

#### Response Examples
##### Status: 201 Created
```
Content-Location: https://<your-app>/stops/abc123
 
{
  "id": "abc123",
  "name": "Gilman St & San Pablo Av",
  "lat": 37.8803386,
  "lon": -122.2966763,
  "ridership": 200,
  "issues": [],
  "self": "https://<your-app>/stops/abc123"
}
```
##### Status: 400 Bad Request
```
{
  "Error": "The request object is missing at least one of the required attributes"
}
```

##### Status: 406 Not Acceptable
```
{
 "Error": "Requested content format is not supported or was not provided in the request object" 
}
```

## View a stop
Gets an existing bus stop.
```
GET /stops/:stop_id
```
### Request
#### Request Parameters
| **Name** | **Type** | **Description** | **Required?** |
| --- | --- | --- | --- |
| stop\_id | string | ID of the stop | yes |

#### Request Header
| **Field** | **Description** | **Required?** |
| --- | --- | --- |
| Accept | The format of the content to be returned. Must be **application/json**. | yes |

#### Request Body
None
### Response
#### Response Body Format
JSON
#### Response Statuses
| **Outcome** | **Status Code** | **Reason** |
| --- | --- | --- |
| Success | 200 OK |   |
| Failure | 404 Not Found | No stop with the given stop\_id exists |
| Failure | 406 Not Acceptable | Requested content format is not supported or was not provided |

#### Response Examples
##### Status: 200 OK
```
{
  "id": "abc123",
  "name": "Gilman St & San Pablo Av",
  "lat": 37.8803386,
  "lon": -122.2966763,
  "ridership": 200,
  "issues":[
  {
    "id":"123abc",
    "self":"https://<your-app>/issues/123abc"
  },
  {
    "id":"456def",
    "self":"https://<your-app>/issues/456def"
  }
  ],
  "self": "https://<your-app>/stops/abc123"
}
```
##### Status: 404 Not Found
```
{
 "Error": "No stop with this stop_id exists" 
}
```
##### Status: 406 Not Acceptable
```
{
 "Error": "Requested content format is not supported or was not provided in the request object"
}
```

## View all stops
Lists all the stops. Will return five stops at a time.
```
GET /stops?cursor=:cursor_id
```
### Request
#### Request Parameters
| **Name** | **Type** | **Description** | **Required?** |
| --- | --- | --- | --- |
| cursor\_id | string | Query cursor marking the last result retrieved. | no |

#### Request Header
| **Field** | **Description** | **Required?** |
| --- | --- | --- |
| Accept | The format of the content to be returned. Must be **application/json**. | yes |

#### Request Body
None

### Response
#### Response Body Format
JSON
#### Response Statuses
| **Outcome** | **Status Code** | **Reason** |
| --- | --- | --- |
| Success | 200 OK |   |
| Failure | 404 Not Found | The cursor\_id is invalid |
| Failure | 406 Not Acceptable | Requested content format is not supported or was not provided |

#### Response Examples
##### Status: 200 OK
```
{
  "results": [
  {
    "id": "abc123",
    "name": "Gilman St & San Pablo Av",
    "lat": 37.8803386,
    "lon": -122.2966763,
    "ridership": 200,
    "issues": [
    {
      "id": "123abc",
      "self": "https://<your-app>/issues/123abc"
    },
    {
      "id": "456def",
      "self": "https://<your-app>/issues/456def"
    }
    ],
    "self": "https://<your-app>/stops/abc123"
  },
  {
    "id": "def456",
    "name": "Gilman St & San Pablo Av",
    "lat": 37.8907379,
    "lon": -122.2888764,
    "ridership": 325,
    "issues": [
    {
      "id": "789ghi",
      "self": "https://<your-app>/issues/789ghi"
    }
    ],
    "self": "https://<your-app>/stops/def456"
  },
 
  ...
  
  ],
  "next": "https://<your-app>/stops?cursor=def456"
}
```
##### Status: 404 Not Found
```
{
  "Error": "Invalid cursor value provided"
}
```
##### Status: 406 Not Acceptable
```
{
 "Error": "Requested content format is not supported or was not provided in the request object"
}
```

## Replace a stop
Replaces an existing stop with all new attribute values. If a new ridership value is not provided, it will be reset to null. Retains any existing associations to issues.
```
PUT /stops/:stop_id
```
### Request
#### Request Parameters
| **Name** | **Type** | **Description** | **Required?** |
| --- | --- | --- | --- |
| stop\_id | string | ID of the stop | yes |

#### Request Header
| **Field** | **Description** | **Required?** |
| --- | --- | --- |
| Accept | The format of the content to be returned. Must be **application/json**. | yes |

#### Request Body
Required
#### Request Body Format
JSON
#### Request JSON Attributes
| **Name** | **Type** | **Description** | **Required?** |
| --- | --- | --- | --- |
| name | string | The name of the stop, typically the nearest cross streets | yes |
| lat | float | The latitude coordinate of the bus stop location | yes |
| long | float | The longitude coordinate of the bus stop location | yes |
| ridership | integer | The average daily ridership at the bus stop | no |

#### Request Body Example
```
{
  "name": "Gilman St & 7th St",
  "lat": 37.8797469,
  "lon": -122.2997233
}
```
### Response
#### Response Body Format
JSON
#### Response Statuses
| **Outcome** | **Status Code** | **Reason** |
| --- | --- | --- |
| Success | 201 Created |   |
| Failure | 400 Bad Request | The request was missing one or more of the 3 required attributes. |
| Failure | 404 Not Found | No stop with this stop\_id exists |
| Failure | 406 Not Acceptable | Requested content format is not supported or was not provided |

#### Response Examples
##### Status: 201 Created
```
Content-Location: https://<your-app>/stops/abc123
 
{
  "id": "abc123",
  "name": "Gilman St & 7th St",
  "lat": 37.8797469,
  "lon": -122.2997233,
  "ridership": null,
  "issues":[
  {
    "id":"123abc",
    "self":"https://<your-app>/issues/123abc"
  },
  {
    "id":"456def",
    "self":"https://<your-app>/issues/456def"
  }
  ],
  "self": "https://<your-app>/stops/abc123"
}
```
##### Status: 400 Bad Request
```
{
  "Error": "The request object is missing at least one of the required attributes"
}
```
##### Status: 404 Not Found
```
{
  "Error": "No stop with this stop_id exists"
}
```
##### Status: 406 Not Acceptable
```
{
 "Error": "Requested content format is not supported or was not provided in the request object"
}
```

## Update a stop
Updates one or more attributes of an existing stop.
```
PATCH /stops/:stop_id
```
### Request
#### Request Parameters
| **Name** | **Type** | **Description** | **Required?** |
| --- | --- | --- | --- |
| stop\_id | string | ID of the stop | yes |

#### Request Header
| **Field** | **Description** | **Required?** |
| --- | --- | --- |
| Accept | The format of the content to be returned. Must be **application/json**. | yes |

#### Request Body
Required
#### Request Body Format
JSON
#### Request JSON Attributes
| **Name** | **Type** | **Description** | **Required?** |
| --- | --- | --- | --- |
| name | string | The name of the stop, typically the nearest cross streets | no |
| lat | float | The latitude coordinate of the bus stop location | no |
| long | float | The longitude coordinate of the bus stop location | no |
| ridership | integer | The average daily ridership at the bus stop | no |

#### Request Body Example
```
{
  "name": "Gilman St & Seventh St"
}
```
### Response
#### Response Body Format
JSON
#### Response Statuses
| **Outcome** | **Status Code** | **Reason** |
| --- | --- | --- |
| Success | 200 OK |   |
| Failure | 404 Not Found | No stop with this stop\_id exists |
| Failure | 406 Not Acceptable | Requested content format is not supported or was not provided |

#### Response Examples
##### Status: 200 OK
```
Content-Location: https://<your-app>/stops/abc123
 
{
  "id": "abc123",
  "name": "Gilman St & Seventh St",
  "lat": 37.8803386,
  "lon": -122.2966763,
  "ridership": 200,
  "issues":[
  {
    "id":"123abc",
    "self":"https://<your-app>/issues/123abc"
  },
  {
    "id":"456def",
    "self":"https://<your-app>/issues/456def"
  }
  ],
  "self": "https://<your-app>/stops/abc123"
}
```
##### Status: 404 Not Found
```
{
  "Error": "No stop with this stop_id exists"
}
```
##### Status: 406 Not Acceptable
```
{
 "Error": "Requested content format is not supported or was not provided in the request object"
}
```

## Delete a stop
Deletes a stop. Note that deleting a stop will disassociate any issues related to it (i.e., bus stop for related issues will be set to null).
```
DELETE /stops/:stop_id
```
### Request
#### Request Parameters
| **Name** | **Type** | **Description** | **Required?** |
| --- | --- | --- | --- |
| stop\_id | string | ID of the stop | yes |

#### Request Body
None
### Response
#### Response Body Format
None (success) or JSON (failure)
#### Response Statuses
| **Outcome** | **Status Code** | **Reason** |
| --- | --- | --- |
| Success | 204 No Content |   |
| Failure | 404 Not Found | No stop with this stop\_id exists |

#### Response Examples
##### Status: 404 Not Found
```
{
  "Error": "No stop with this stop_id exists"
}
```
