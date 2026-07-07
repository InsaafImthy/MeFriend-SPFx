using MeFriend.Api.Models.Common;
using MeFriend.Api.Models.SalesOrders;
using MeFriend.Api.Services;
using MeFriend.Api.Validators;
using Microsoft.AspNetCore.Mvc;

namespace MeFriend.Api.Controllers;

[ApiController]
[Route("api/sales-orders")]
public sealed class SalesOrdersController : ControllerBase
{
    private readonly IBusinessCentralSalesOrderService _salesOrderService;

    public SalesOrdersController(IBusinessCentralSalesOrderService salesOrderService)
    {
        _salesOrderService = salesOrderService;
    }

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken cancellationToken)
    {
        var response = await _salesOrderService.GetSalesOrdersAsync(cancellationToken);
        return StatusCode(StatusCodes.Status501NotImplemented, response);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id, CancellationToken cancellationToken)
    {
        var response = await _salesOrderService.GetSalesOrderByIdAsync(id, cancellationToken);
        return StatusCode(StatusCodes.Status501NotImplemented, response);
    }

    [HttpPost]
    public async Task<IActionResult> Create(
        SalesOrderCreateRequest request,
        CancellationToken cancellationToken)
    {
        var errors = SalesOrderValidator.ValidateCreate(request);
        if (errors.Count > 0)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(
                "ValidationFailed",
                "Sales order request validation failed.",
                validationErrors: errors.ToDictionary(error => error.Code, error => new[] { error.Message })));
        }

        var response = await _salesOrderService.CreateSalesOrderAsync(request, cancellationToken);
        return StatusCode(StatusCodes.Status501NotImplemented, response);
    }

    [HttpGet("{id}/invoices")]
    public async Task<IActionResult> GetInvoices(string id, CancellationToken cancellationToken)
    {
        var response = await _salesOrderService.GetInvoicesForSalesOrderAsync(id, cancellationToken);
        return StatusCode(StatusCodes.Status501NotImplemented, response);
    }
}
