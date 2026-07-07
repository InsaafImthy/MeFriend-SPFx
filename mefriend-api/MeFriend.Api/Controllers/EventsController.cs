using MeFriend.Api.Models.Events;
using MeFriend.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace MeFriend.Api.Controllers;

[ApiController]
[Route("api/events")]
public sealed class EventsController : ControllerBase
{
    private readonly IBusinessCentralEventService _eventService;

    public EventsController(IBusinessCentralEventService eventService)
    {
        _eventService = eventService;
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] EventFilterRequest request, CancellationToken cancellationToken)
    {
        var response = await _eventService.GetEventsAsync(request, cancellationToken);
        return StatusCode(StatusCodes.Status501NotImplemented, response);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id, CancellationToken cancellationToken)
    {
        var response = await _eventService.GetEventByIdAsync(id, cancellationToken);
        return StatusCode(StatusCodes.Status501NotImplemented, response);
    }
}
