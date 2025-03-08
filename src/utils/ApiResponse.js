class ApiResponse {
    constructor(statusCode, message = "Sucsess", data){
        this.statusCode = statusCode;
        this.message = message;
        this.data = data;
        this.success = statusCode < 400;
    }
}

export { ApiResponse }