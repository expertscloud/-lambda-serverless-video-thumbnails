
async function successResponse(data, message, status){
    return {
      statusCode: 200,
      body: JSON.stringify({
        status: status,
        message: message,
        data: data,
      }),
    };
  }

  module.exports={ successResponse }