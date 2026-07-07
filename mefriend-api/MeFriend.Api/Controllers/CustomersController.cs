using MeFriend.Api.Models.Customers;
using MeFriend.Api.Models.Common;
using MeFriend.Api.Services;
using MeFriend.Api.Validators;
using Microsoft.AspNetCore.Mvc;

namespace MeFriend.Api.Controllers;

[ApiController]
[Route("api/customers")]
public sealed class CustomersController : ControllerBase
{
    private readonly IBusinessCentralCustomerService _customerService;

    public CustomersController(IBusinessCentralCustomerService customerService)
    {
        _customerService = customerService;
    }

    [HttpPost]
    public async Task<IActionResult> Create(
        CustomerCreateRequest request,
        CancellationToken cancellationToken)
    {
        var errors = CustomerValidator.ValidateCreate(request);
        if (errors.Count > 0)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(
                "ValidationFailed",
                "Customer request validation failed.",
                validationErrors: errors
                    .GroupBy(error => error.Details ?? error.Code)
                    .ToDictionary(
                        group => group.Key,
                        group => group.Select(error => error.Message).ToArray())));
        }

        var response = await _customerService.CreateAsync(request, cancellationToken);
        return StatusCode(StatusCodes.Status501NotImplemented, response);
    }
}
