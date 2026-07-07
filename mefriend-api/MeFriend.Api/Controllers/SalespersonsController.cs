using MeFriend.Api.Models.Salespersons;
using MeFriend.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace MeFriend.Api.Controllers;

[ApiController]
[Route("api/salespersons")]
public sealed class SalespersonsController : ControllerBase
{
    private readonly IBusinessCentralSalespersonService _salespersonService;

    public SalespersonsController(IBusinessCentralSalespersonService salespersonService)
    {
        _salespersonService = salespersonService;
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] SalespersonFilterRequest request, CancellationToken cancellationToken)
    {
        var response = await _salespersonService.GetSalespersonsAsync(request, cancellationToken);
        return StatusCode(StatusCodes.Status501NotImplemented, response);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id, CancellationToken cancellationToken)
    {
        var response = await _salespersonService.GetSalespersonByIdAsync(id, cancellationToken);
        return StatusCode(StatusCodes.Status501NotImplemented, response);
    }
}
